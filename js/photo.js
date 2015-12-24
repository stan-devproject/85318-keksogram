'use strict';

requirejs.config({
  baseUrl: 'js'
});

define(function() {
  /**
   * Таймаут ожидания загрузки, после которого загрузка считается несостоявшейся.
   * @const
   * @type {number}
   */
  var LOAD_TIMEOUT = 10000;

  /**
   * @param {Object} data
   * @constructor
   */
  function Photo(data) {
    this._data = data;

    this._onClick = this._onClick.bind(this);
  }

  /**
   * Метод занимается отрисовкой элемента фотографии в списке.
   * Для каждого элемента создаем DOM-элемент на основе шаблона.
   */
  Photo.prototype.render = function() {
    var template = document.querySelector('#picture-template');

    if ('content' in template) {
      this.element = template.content.children[0].cloneNode(true);
    } else {
      // Мы имеем дело с IE.
      this.element = template.children[0].cloneNode(true);
    }

    this.element.querySelector('.picture-comments').textContent = this._data.comments.toString();
    this.element.querySelector('.picture-likes').textContent = this._data.likes.toString();

    /**
     * @type {Image}
     */
    var pictureImage = new Image();

    // Обработчик успешной загрузки изображения.
    pictureImage.onload = function() {
      // Отменяем таймаут, так как изображение успешно загрузилось.
      clearTimeout(imageLoadTimeout);

      pictureImage.width = 182;
      pictureImage.height = 182;

      this.element.replaceChild(pictureImage, this.element.querySelector('img'));
    }.bind(this);

    // Обработчик ошибки при загрузке изображения.
    pictureImage.onerror = function() {
      if (!this.element.classList.contains('picture-load-failure')) {
        this.element.classList.add('picture-load-failure');
      }
    }.bind(this);

    // Обработчик ошибки, если сервер не отвечает из-за таймаута.
    var imageLoadTimeout = setTimeout(function() {
      // Прекращаем загрузку
      pictureImage.src = '';

      // Показываем ошибку.
      if (!this.element.classList.contains('picture-load-failure')) {
        this.element.classList.add('picture-load-failure');
      }
    }.bind(this), LOAD_TIMEOUT);

    // Запускаем загрузку изображения.
    pictureImage.src = this._data.url;

    // Устанавливаем обработчик события клика по фотографии,
    // чтобы он открывался в галерее.
    this.element.addEventListener('click', this._onClick);
  };

  /**
   * Переопределяемый коллбек, который вызывается при клике на загруженную фотографию.
   * @type {?function}
   */
  Photo.prototype.onClick = null;

  /**
   * Внутренний обработчик клика по фотографии, который затем вызывает коллбек.
   * @type {function}
   */
  Photo.prototype._onClick = function(evt) {
    evt.preventDefault();
    if (!this.element.classList.contains('picture-load-failure')) {
      if (typeof this.onClick === 'function') {
        this.onClick();
      }
    }
  };

  /**
   * Удаление обработчика клика по фотографии.
   * @override
   */
  Photo.prototype.remove = function() {
    this.element.removeEventListener('click', this._onClick);
  }

  return Photo;
});
