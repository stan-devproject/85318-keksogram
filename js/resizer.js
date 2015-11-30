'use strict';

(function() {
  /**
   * @constructor
   * @param {FileBuffer}
   */
  var Resizer = function(image, formInputResizeX, formInputResizeY, formInputResizeSize) {
    // Изображение, с которым будет вестись работа.
    this._image = new Image();
    this._image.src = image;

    // Холст.
    this._container = document.createElement('canvas');
    this._ctx = this._container.getContext('2d');

    // Создаем холст только после загрузки изображения.
    this._image.onload = function() {
      // Размер холста равен размеру загруженного изображения. Это нужно
      // для удобства работы с координатами.
      this._container.width = this._image.naturalWidth;
      this._container.height = this._image.naturalHeight;

      /**
       * Предлагаемый размер кадра в виде коэффициента относительно меньшей
       * стороны изображения.
       * @const
       * @type {number}
       */
      var INITIAL_SIDE_RATIO = 0.75;
      // Размер меньшей стороны изображения.
      var side = Math.min(
          this._container.width * INITIAL_SIDE_RATIO,
          this._container.height * INITIAL_SIDE_RATIO);

      // Изначально предлагаемое кадрирование — часть по центру с размером в 3/4
      // от размера меньшей стороны.
      this._resizeConstraint = new Square(
          Math.round(this._container.width / 2 - side / 2),
          Math.round(this._container.height / 2 - side / 2),
          Math.round(side));

      // Задаем начальные значения полям Слева, Сверху и Сторона.
      formInputResizeX.value = Math.round(this._container.width / 2 - side / 2);
      formInputResizeY.value = Math.round(this._container.height / 2 - side / 2);
      formInputResizeSize.value = Math.round(side);

      // Отрисовка изначального состояния канваса.
      this.redraw();
    }.bind(this);

    // Фиксирование контекста обработчиков.
    this._onDragStart = this._onDragStart.bind(this);
    this._onDragEnd = this._onDragEnd.bind(this);
    this._onDrag = this._onDrag.bind(this);
  };

  Resizer.prototype = {
    /**
     * Родительский элемент канваса.
     * @type {Element}
     * @private
     */
    _element: null,

    /**
     * Положение курсора в момент перетаскивания. От положения курсора
     * рассчитывается смещение на которое нужно переместить изображение
     * за каждую итерацию перетаскивания.
     * @type {Coordinate}
     * @private
     */
    _cursorPosition: null,

    /**
     * Объект, хранящий итоговое кадрирование: сторона квадрата и смещение
     * от верхнего левого угла исходного изображения.
     * @type {Square}
     * @private
     */
    _resizeConstraint: null,

    /**
     * Отрисовка канваса.
     */
    redraw: function() {
      // Очистка изображения.
      this._ctx.clearRect(0, 0, this._container.width, this._container.height);

      // Параметры линии.
      // NB! Такие параметры сохраняются на время всего процесса отрисовки
      // canvas'a поэтому важно вовремя поменять их, если нужно начать отрисовку
      // чего-либо с другой обводкой.

      // Выберите тип линии-обводки.
      // default - стандартные крупные штрихи
      // dotted - желтые точки
      var RECT_BORDER_STYLE = 'dotted';

      // На сколько пикселей вверх над обрезающей рамкой рисовать текст с его размерами
      var LINE_OUTPUT_Y_OFFSET = 10;

      // Шрифт текста с размерами обрезающей рамки
      var LINE_OUTPUT_FONT = '16px serif';

      // Цвет текста с размерами обрезающей рамки
      var LINE_OUTPUT_COLOR = '#fff';

      // Отступ от границы изображения до затемняющей рамки.
      // Значение по умолчанию, меняется ниже в зависимости от режима отрисовки рамки.
      var lineWidthMoiety = 6;

      if (RECT_BORDER_STYLE === 'default') {
        // Толщина линии.
        this._ctx.lineWidth = 6;
        // Цвет обводки.
        this._ctx.strokeStyle = '#ffe753';
        // Размер штрихов. Первый элемент массива задает длину штриха, второй
        // расстояние между соседними штрихами.
        this._ctx.setLineDash([15, 10]);
        // Смещение первого штриха от начала линии.
        this._ctx.lineDashOffset = 7;
        // Отступ для обрезающей рамки.
        // В данном случае берется, как половина толщины линии обводки.
        lineWidthMoiety = this._ctx.lineWidth / 2;

      } else if (RECT_BORDER_STYLE === 'dotted') {
        // Убираем линию обводки.
        this._ctx.lineWidth = 0;
        // Цвет обводки.
        this._ctx.strokeStyle = 'transparent';
        // Отступ от обрезающей рамки.
        lineWidthMoiety = 3;
        // Цвет точек.
        var RECT_BORDER_DOT_COLOR = 'yellow';
        // Радиус точек.
        var RECT_BORDER_DOT_RADIUS = 2;
        // Отступ между точками.
        var RECT_BORDER_DOT_OFFSET = 3;
        // Стартовый отступ.
        var RECT_BORDER_DOT_START_OFFSET = 0;
      }

      // Сохранение состояния канваса.
      // Подробней см. строку 132.
      this._ctx.save();

      // Установка начальной точки системы координат в центр холста.
      this._ctx.translate(this._container.width / 2, this._container.height / 2);

      // Далее координаты задаются от центра холста.

      // Подсчитываем начальную левую-верхнюю точку канваса
      // Не использую displX, displY, так как они возвращают позицию изображения,
      // а в будущем его может быть потребуется сместить.
      var canvasX = -(this._container.width / 2);
      var canvasY = -(this._container.height / 2);

      // И правую-нижнюю точку канваса.
      var canvasMaxX = (this._container.width / 2);
      var canvasMaxY = (this._container.width / 2);

      // Координаты (левая верхняя точка) изображения.
      var displX = -(this._resizeConstraint.x + this._resizeConstraint.side / 2);
      var displY = -(this._resizeConstraint.y + this._resizeConstraint.side / 2);

      // Отрисовка изображения на холсте.
      // Параметры задают изображение, которое
      // нужно отрисовать и координаты его верхнего левого угла.
      this._ctx.drawImage(this._image, displX, displY);

      // Координаты прямоугольника, обозначающего область изображения после
      // кадрирования.
      var rectX = (-this._resizeConstraint.side / 2) - lineWidthMoiety;
      var rectY = (-this._resizeConstraint.side / 2) - lineWidthMoiety;

      // Координаты крайней правой нижней точки обрезающей области.
      var rectMaxX = rectX + this._resizeConstraint.side;
      var rectMaxY = rectY + this._resizeConstraint.side;

      // Ширина и высота прямоугольника, обозначающего область изображения после кадрирования.
      var rectWidth = this._resizeConstraint.side - lineWidthMoiety;
      var rectHeight = this._resizeConstraint.side - lineWidthMoiety;

      // Отрисовка обводки желтыми точками, если требуется.
      // Иначе рисуется обводка по умолчанию.
      if (RECT_BORDER_STYLE === 'dotted') {
        this._ctx.beginPath();

        this._ctx.fillStyle = RECT_BORDER_DOT_COLOR;

        this._ctx.moveTo(rectX, rectY);

        for (var i = rectX + RECT_BORDER_DOT_START_OFFSET; (i + 2 * RECT_BORDER_DOT_RADIUS) <= rectMaxX; i += 2 * RECT_BORDER_DOT_RADIUS + RECT_BORDER_DOT_OFFSET) {
          this._ctx.arc(i, rectY, RECT_BORDER_DOT_RADIUS, 0, 2 * Math.PI);
        }

        this._ctx.fill();
        this._ctx.beginPath();

        for (i = rectY + RECT_BORDER_DOT_START_OFFSET; (i + 2 * RECT_BORDER_DOT_RADIUS) <= rectMaxY; i += 2 * RECT_BORDER_DOT_RADIUS + RECT_BORDER_DOT_OFFSET) {
          this._ctx.arc(rectMaxX - lineWidthMoiety, i, RECT_BORDER_DOT_RADIUS, 0, 2 * Math.PI);
        }

        this._ctx.fill();
        this._ctx.beginPath();

        for (i = rectMaxX - lineWidthMoiety - RECT_BORDER_DOT_START_OFFSET; (i - 2 * RECT_BORDER_DOT_RADIUS) >= rectX; i -= 2 * RECT_BORDER_DOT_RADIUS + RECT_BORDER_DOT_OFFSET) {
          this._ctx.arc(i, rectMaxY - lineWidthMoiety, RECT_BORDER_DOT_RADIUS, 0, 2 * Math.PI);
        }

        this._ctx.fill();
        this._ctx.beginPath();

        for (i = rectMaxY - lineWidthMoiety - RECT_BORDER_DOT_START_OFFSET; (i - 2 * RECT_BORDER_DOT_RADIUS) >= rectY; i -= 2 * RECT_BORDER_DOT_RADIUS + RECT_BORDER_DOT_OFFSET) {
          this._ctx.arc(rectX, i, RECT_BORDER_DOT_RADIUS, 0, 2 * Math.PI);
        }

        this._ctx.fill();
      }

      // Отрисовка прямоугольника, обозначающего область изображения после
      // кадрирования. Координаты задаются от центра.
      this._ctx.strokeRect(rectX, rectY, rectWidth, rectHeight);

      // Задаем параметры затемнения областей, которые потом не попадут в итоговое изображение.
      this._ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';

      // Добавляем прямоугольники для затемнения части изображения, которое не обрезается.
      // Верхний прямоугольник.
      this._ctx.fillRect(
        canvasX,
        canvasY,
        this._container.width,
        (rectY - lineWidthMoiety - canvasY)
      );

      // Левый прямоугольник (высота как и у обрезающей рамки)
      this._ctx.fillRect(
        canvasX,
        (rectY - lineWidthMoiety),
        (rectY - lineWidthMoiety - canvasY),
        (this._resizeConstraint.side + lineWidthMoiety)
      );

      // Правый прямоугольник (высота как и у обрезающей рамки)
      this._ctx.fillRect(
        rectMaxX,
        (rectY - lineWidthMoiety),
        (canvasMaxX - rectMaxX + lineWidthMoiety),
        (this._resizeConstraint.side + lineWidthMoiety)
      );

      // Нижний прямоугольник
      this._ctx.fillRect(
        canvasX,
        rectMaxY,
        this._container.width,
        (canvasMaxY - rectMaxY + lineWidthMoiety)
      );


      // Добавление текстовой строчки с размерами кадрируемого изображения.
      var lineSizeOutput = this._image.naturalWidth + ' x ' + this._image.naturalHeight;
      var lineSizeOutputX = rectX + (this._resizeConstraint.side / 2) - (this._ctx.measureText(lineSizeOutput).width / 2);
      var lineSizeOutputY = rectY - LINE_OUTPUT_Y_OFFSET;

      this._ctx.font = LINE_OUTPUT_FONT;
      this._ctx.fillStyle = LINE_OUTPUT_COLOR;
      this._ctx.fillText(lineSizeOutput, lineSizeOutputX, lineSizeOutputY);

      // Восстановление состояния канваса, которое было до вызова ctx.save
      // и последующего изменения системы координат. Нужно для того, чтобы
      // следующий кадр рисовался с привычной системой координат, где точка
      // 0 0 находится в левом верхнем углу холста, в противном случае
      // некорректно сработает даже очистка холста или нужно будет использовать
      // сложные рассчеты для координат прямоугольника, который нужно очистить.
      this._ctx.restore();
    },

    /**
     * Включение режима перемещения. Запоминается текущее положение курсора,
     * устанавливается флаг, разрешающий перемещение и добавляются обработчики,
     * позволяющие перерисовывать изображение по мере перетаскивания.
     * @param {number} x
     * @param {number} y
     * @private
     */
    _enterDragMode: function(x, y) {
      this._cursorPosition = new Coordinate(x, y);
      document.body.addEventListener('mousemove', this._onDrag);
      document.body.addEventListener('mouseup', this._onDragEnd);
    },

    /**
     * Выключение режима перемещения.
     * @private
     */
    _exitDragMode: function() {
      this._cursorPosition = null;
      document.body.removeEventListener('mousemove', this._onDrag);
      document.body.removeEventListener('mouseup', this._onDragEnd);
    },

    /**
     * Перемещение изображения относительно кадра.
     * @param {number} x
     * @param {number} y
     * @private
     */
    updatePosition: function(x, y) {
      this.moveConstraint(
          this._cursorPosition.x - x,
          this._cursorPosition.y - y);
      this._cursorPosition = new Coordinate(x, y);
    },

    /**
     * @param {MouseEvent} evt
     * @private
     */
    _onDragStart: function(evt) {
      this._enterDragMode(evt.clientX, evt.clientY);
    },

    /**
     * Обработчик окончания перетаскивания.
     * @private
     */
    _onDragEnd: function() {
      this._exitDragMode();
    },

    /**
     * Обработчик события перетаскивания.
     * @param {MouseEvent} evt
     * @private
     */
    _onDrag: function(evt) {
      this.updatePosition(evt.clientX, evt.clientY);
    },

    /**
     * Добавление элемента в DOM.
     * @param {Element} element
     */
    setElement: function(element) {
      if (this._element === element) {
        return;
      }

      this._element = element;
      this._element.insertBefore(this._container, this._element.firstChild);
      // Обработчики начала и конца перетаскивания.
      this._container.addEventListener('mousedown', this._onDragStart);
    },

    /**
     * Возвращает кадрирование элемента.
     * @return {Square}
     */
    getConstraint: function() {
      return this._resizeConstraint;
    },

    /**
     * Смещает кадрирование на значение указанное в параметрах.
     * @param {number} deltaX
     * @param {number} deltaY
     * @param {number} deltaSide
     */
    moveConstraint: function(deltaX, deltaY, deltaSide) {
      this.setConstraint(
          this._resizeConstraint.x + (deltaX || 0),
          this._resizeConstraint.y + (deltaY || 0),
          this._resizeConstraint.side + (deltaSide || 0));
    },

    /**
     * @param {number} x
     * @param {number} y
     * @param {number} side
     */
    setConstraint: function(x, y, side) {
      if (typeof x !== 'undefined') {
        this._resizeConstraint.x = x;
      }

      if (typeof y !== 'undefined') {
        this._resizeConstraint.y = y;
      }

      if (typeof side !== 'undefined') {
        this._resizeConstraint.side = side;
      }

      requestAnimationFrame(function() {
        this.redraw();
        window.dispatchEvent(new CustomEvent('resizerchange'));
      }.bind(this));
    },

    /**
     * Удаление. Убирает контейнер из родительского элемента, убирает
     * все обработчики событий и убирает ссылки.
     */
    remove: function() {
      this._element.removeChild(this._container);

      this._container.removeEventListener('mousedown', this._onDragStart);
      this._container = null;
    },

    /**
     * Экспорт обрезанного изображения как HTMLImageElement и исходником
     * картинки в src в формате dataURL.
     * @return {Image}
     */
    exportImage: function() {
      // Создаем Image, с размерами, указанными при кадрировании.
      var imageToExport = new Image();

      // Создается новый canvas, по размерам совпадающий с кадрированным
      // изображением, в него добавляется изображение взятое из канваса
      // с измененными координатами и сохраняется в dataURL, с помощью метода
      // toDataURL. Полученный исходный код, записывается в src у ранее
      // созданного изображения.
      var temporaryCanvas = document.createElement('canvas');
      var temporaryCtx = temporaryCanvas.getContext('2d');
      temporaryCanvas.width = this._resizeConstraint.side;
      temporaryCanvas.height = this._resizeConstraint.side;
      temporaryCtx.drawImage(this._image,
          -this._resizeConstraint.x,
          -this._resizeConstraint.y);
      imageToExport.src = temporaryCanvas.toDataURL('image/png');

      return imageToExport;
    }
  };

  /**
   * Вспомогательный тип, описывающий квадрат.
   * @constructor
   * @param {number} x
   * @param {number} y
   * @param {number} side
   * @private
   */
  var Square = function(x, y, side) {
    this.x = x;
    this.y = y;
    this.side = side;
  };

  /**
   * Вспомогательный тип, описывающий координату.
   * @constructor
   * @param {number} x
   * @param {number} y
   * @private
   */
  var Coordinate = function(x, y) {
    this.x = x;
    this.y = y;
  };

  window.Resizer = Resizer;
})();
