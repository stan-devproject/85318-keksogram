'use strict';

(function() {

  /**
   * Форма с фильтрами списка фотографий.
   * @type {object}
   */
  var filtersForm = document.querySelector('.filters');

  /**
   * Контейнер, куда сохраняются сгенерированные шаблоны.
   * @type {object}
   */
  var container = document.querySelector('.pictures');

  /**
   * Массив, который будет хранить загруженный список картинок.
   * @type {Array}
   */
  var loadedPicturesData = [];

  /**
   * Массив, который будет хранить отсортированный (выбранным фильтром) список картинок.
   * @type {Array}
   */
  var filteredPicturesData = [];

  /**
   * Текущая страница при выдаче списка фотографий.
   * @type {number}
   */
  var currentPage = 0;

  /**
   * Количество изображений на одной странице.
   * @const
   * @type {number}
   */
  var PAGE_SIZE = 12;

  /**
   * Таймаут ожидания загрузки, после которого загрузка считается несостоявшейся.
   * @const
   * @type {number}
   */
  var LOAD_TIMEOUT = 10000;

  /**
   * Таймаут тротлинга для оптимизации нагрузки (используется в обработчике скролла)
   * @const
   * @type {number}
   */
  var THROTTLE_TIMEOUT = 100;

  /**
   * @type {Gallery}
   */
  var gallery = new Gallery();

  /**
   * Форма выбора фильтра списка фотографий.
   * @type {HTMLFormElement}
   */
  var filterPicturesForm = document.forms['main-pictures-filter'];

  /**
   * @type {Object.<string, string>}
   */
  var filterPicturesMap = {
    'popular': 'filter-popular',
    'new': 'filter-new',
    'discussed': 'filter-discussed'
  };

  /**
   * Фильтр по умолчанию. Указывается ключ массива filterMap.
   * @const
   * @type {number}
   */
  var FILTER_PICTURES_DEFAULT = 'popular';

  /**
   * Функция, запускающая инициализацию модуля списка фотографий.
   */
  function picturesInitialize() {
    // Скрываем блок с фильтрами.
    picturesFiltersHide();

    // Скачиваем список и отображаем изображения. (с использованием шаблона)
    getPicturesAndRender();

    // Показываем блок с фильтрами.
    picturesFiltersShow();

    // Устанавливаем обработчик, который следит за переключениями фильтров списка фотографий.
    filtersForm.addEventListener('change', function(evt) {
      // При условии, если эта цель - радиобаттон.
      if (evt.target.classList.contains('filters-radio')) {
        // Устанавливаем новый активный фильтр.
        // Внутри функции отрендеривается с нуля первая страница с изображениями.
        // И дальше страница заполняется другими изображениями (добавляются еще страницы), если еще есть место.
        // и до тех пор, пока есть что показывать.
        setActivePictureFilter(evt.target.value);
      }
    });

    // Устанавливаем обработчик изменения скролла для отрисовки новых страниц с изображениями.
    // Это оптимизация (тротлинг), чтобы слишком часто не вызывалась данная функция.
    var scrollTimeout;
    window.addEventListener('scroll', function() {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(autoLoadPictures, THROTTLE_TIMEOUT);
    });

    // Обработчик, который следит за изменением размера страницы.
    // Например, открыли на маленьком окне, а потом увеличили на весь рабочий стол.
    var resizeTimeout;
    window.addEventListener('resize', function() {
      clearTimeout(resizeTimeout);
      scrollTimeout = setTimeout(fillViewportWithPictures, THROTTLE_TIMEOUT);
    });
  }

  /**
   * Возвращает значение фильтра картинок.
   * Либо последнее сохраненное пользователем, либо значение по умолчанию.
   */
  function getDefaultPicturesFilter() {
    var storageActiveFilter = localStorage.getItem('activePictureFilter');

    if (storageActiveFilter && filterPicturesMap[storageActiveFilter]) {
      return storageActiveFilter;
    }

    // Иначе возвращается фильтр по умолчанию.
    return FILTER_PICTURES_DEFAULT;
  }

  /**
   * Сохраняем текущее значение фильтра списка фотографий в localStorage.
   * @param {string} selectedFilter
   */
  function savePicturesFilterInStorage(selectedFilter) {
    localStorage.setItem('activePictureFilter', selectedFilter);
  }

  /**
   * Переключение radio-input`ов текущего фильтра списка фотографий.
   * @param {string} filter
   */
  function setPicturesFilter(filter) {
    for (var i = 0; i < filterPicturesForm['filter'].length; i++) {
      if (filterPicturesForm['filter'][i].value === filter) {
        filterPicturesForm['filter'][i].checked = 'checked';
      } else {
        filterPicturesForm['filter'][i].checked = '';
      }
    }
  }

  /**
   * Подгружает следующую страницу при вызове, если это целесообразно.
   */
  function autoLoadPictures() {
    // Находим последнее изображение из отрендеренных.
    var lastPicture = document.querySelector('.pictures .picture:last-child');

    // Если последнее изображение нашлось.
    if (lastPicture) {
      // То получаем данные о его расположении.
      var lastPictureDetails = lastPicture.getBoundingClientRect();

      // Если виден во вьюпорте хотя бы верхний край последнего изображения.
      if (lastPictureDetails.bottom - window.innerHeight <= lastPictureDetails.height) {
        // И если еще есть неотрендеренные страницы.
        if (currentPage < Math.ceil(filteredPicturesData.length / PAGE_SIZE)) {
          // Добавляем еще одну страницу с изображениями в дополнение к текущим.
          picturesRender(filteredPicturesData, ++currentPage, false);
        }
      }
    }
  }

  /**
   * Заполняет только видимую страницу изображениями (столько страниц, сколько нужно),
   * до тех пор, пока есть что показывать.
   */
  function fillViewportWithPictures() {
    // Находим последнее изображенее из отрендеренных.
    var lastPicture = document.querySelector('.pictures .picture:last-child');

    // Если последнее изображение нашлось.
    if (lastPicture) {
      // То получаем данные о его расположении.
      var lastPictureDetails = lastPicture.getBoundingClientRect();

      // Пока виден во вьюпорте хотя бы верхний край последнего изображения
      // И пока есть еще неотрендеренные страницы.
      while ((lastPictureDetails.bottom - window.innerHeight <= lastPictureDetails.height)
      && (currentPage < Math.ceil(filteredPicturesData.length / PAGE_SIZE))) {
        // Добавляем еще одну страницу с изображениями в дополнение к текущим.
        picturesRender(filteredPicturesData, ++currentPage, false);

        // Обновляем данные о расположении самого последнего изображения из отрендеренных,
        // так как мы только что отрендерили еще дополнительные изображения,
        // и последняя картинка теперь другая.

        // Опять находим последнее изображение из отрендеренных.
        lastPicture = document.querySelector('.pictures .picture:last-child');

        // И снова получаем данные о его расположении.
        lastPictureDetails = lastPicture.getBoundingClientRect();
      }
    }
  }

  /**
   * Установка выбранного фильтра картинок.
   * @param {string} selectedFilter
   */
  function setActivePictureFilter(selectedFilter) {
    // Если загруженный массив с картинками скачан.
    if (loadedPicturesData) {
      // Копирование отфильтрованного массива (в глобальную переменную).
      filteredPicturesData = loadedPicturesData.slice(0);

      switch (selectedFilter) {
        case 'popular':
          // Массив остается такой же, так как с такой сортировкой
          // нам приходят данные с сервера.
          break;
        case 'new':
          filteredPicturesData.sort(function(a, b) {
            var aDate = new Date(a.date);
            var bDate = new Date(b.date);

            return bDate.getTime() - aDate.getTime();
          });
          break;
        case 'discussed':
          filteredPicturesData.sort(function(a, b) {
            return b.comments - a.comments;
          });
          break;
      }

      // Сохраняем текущее значение фильтра в localStorage.
      savePicturesFilterInStorage(selectedFilter);

      // Обнуляем текущую страницу.
      currentPage = 0;

      // Обновляем данные в объекте Галереи
      gallery.setPictures(filteredPicturesData);

      // Заполняем первую страницу изображениями с нуля.
      picturesRender(filteredPicturesData, currentPage, true);

      // И дальше страница заполняется другими изображениями (добавляются еще страницы), если еще есть место.
      // и до тех пор, пока есть что показывать.
      fillViewportWithPictures();
    }
  }

  /**
   * Скачивает с сервера данные со списком картинок и их параметрами.
   */
  function getPicturesAndRender() {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', 'data/pictures.json');
    xhr.timeout = LOAD_TIMEOUT;

    // Активируем прелоадер, который пропадет после успешного рендеринга шаблонов.
    if (!container.classList.contains('pictures-loading')) {
      container.classList.add('pictures-loading');
    }

    xhr.onload = function(evt) {
      loadedPicturesData = JSON.parse(evt.target.response);

      var defaultFilter = getDefaultPicturesFilter();

      // Устанавливаем в блоке с фильтрами последнее сохраненное значение или по умолчанию.
      setPicturesFilter(defaultFilter);

      // Запускаем фильтрацию.
      setActivePictureFilter(defaultFilter);

      // Сохраняем данные в объекте Галереи
      // filteredPicturesData появилась, так как мы только что запустили фильтрацию.
      gallery.setPictures(filteredPicturesData);

      // Генерируем первую страницу с изображениями.
      picturesRender(filteredPicturesData, 0, true);

      // Заполняем страницу другими изображениями (еще добавляем страницы), если еще есть место.
      // и до тех пор, пока есть что показывать.
      fillViewportWithPictures();
    };

    // Функция-обработчик ошибки загрузки.
    var loadError = function() {
      // Убираем прелоадер, если есть.
      if (container.classList.contains('pictures-loading')) {
        container.classList.remove('pictures-loading');
      }

      // Добавляем класс, сообщающий об ошибке.
      if (!container.classList.contains('pictures-failure')) {
        container.classList.add('pictures-failure');
      }
    };

    xhr.onerror = loadError;
    xhr.onabort = loadError;
    xhr.ontimeout = loadError;

    xhr.send();
  }

  /**
   * Функция, ответственная за рендеринг картинок на основе шаблонов.
   * @param {object} pictures
   * @param {number} pageNumber
   * @param {boolean} replace
   */
  function picturesRender(pictures, pageNumber, replace) {
    if (replace) {
      // Очищаем содержимое контейнера.
      var renderedElements = container.querySelectorAll('.picture');
      [].forEach.call(renderedElements, function(el) {
        //el.removeEventListener('click', _onClick);
        container.removeChild(el);
      });
    }

    var fragment = document.createDocumentFragment();

    var from = pageNumber * PAGE_SIZE;
    var to = from + PAGE_SIZE;
    var pagePictures = pictures.slice(from, to);

    pagePictures.forEach(function(picture, index) {
      var photoElement = new Photo(picture);
      photoElement.render();
      fragment.appendChild(photoElement.element);

      // Показ галереи по клику на изображение.
      photoElement.onClick = function() {
        gallery.setCurrentPicture(from + index);
        gallery.show();
      };

    });

    // Данные сгенерированы успешно, убираем прелоадер, если он есть.
    if (container.classList.contains('pictures-loading')) {
      container.classList.remove('pictures-loading');
    }

    container.appendChild(fragment);
  }

  /**
   * Прячет блок с фильтрами .filters, добавляя ему класс hidden.
   */
  function picturesFiltersHide() {
    if (!filtersForm.classList.contains('hidden')) {
      filtersForm.classList.add('hidden');
    }
  }

  /**
   * Отображает блок с фильтрами, убирая у него класс hidden.
   */
  function picturesFiltersShow() {
    if (filtersForm.classList.contains('hidden')) {
      filtersForm.classList.remove('hidden');
    }
  }

  // Инициализация модуля.
  picturesInitialize();

})();
