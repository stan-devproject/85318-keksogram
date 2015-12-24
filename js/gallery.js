'use strict';

requirejs.config({
  baseUrl: 'js'
});

define(function() {
  /**
   * @constructor
   */
  var Gallery = function() {
    this.element = document.querySelector('.gallery-overlay');
    this._closeButton = this.element.querySelector('.gallery-overlay-close');
    this._photoImage = this.element.querySelector('.gallery-overlay-image');

    // Привязываем контекст вызова обработчиков событий к текущему объекту.
    this._onCloseClick = this._onCloseClick.bind(this);
    this._onPhotoClick = this._onPhotoClick.bind(this);
    this._onDocumentKeyDown = this._onDocumentKeyDown.bind(this);
    this._getPositionString = this._getPositionString.bind(this);
    this._onHashChange = this._onHashChange.bind(this);

    window.addEventListener('hashchange', this._onHashChange);
  };

  Gallery.prototype = {
    /**
     * Массив фотографий из JSON.
     * @type {Array} _pictures
     */
    _pictures: [],

    /**
     * Хранит номер текущей фотографии, загруженной в галерею.
     * @type {?Number} _currentPictureNumber
     */
    _currentPictureNumber: null,

    /**
     * Хранит результат применения регулярного выражения к хешу.
     */
    _hash: null,

    /**
     * Показ галереи.
     */
    show: function() {
      this.element.classList.remove('invisible');

      // Добавляем обработчик клика по крестику для закрытия галереи.
      this._closeButton.addEventListener('click', this._onCloseClick);

      // Добавляем обработчик клика мышкой на фотографию в галереи.
      this._photoImage.addEventListener('click', this._onPhotoClick);

      // Добавляем обработчик нажатия на клавишу. Ловим Esc.
      window.addEventListener('keydown', this._onDocumentKeyDown);
    },

    /**
     * Скрытие галереи.
     */
    hide: function() {
      this.element.classList.add('invisible');

      // Удаляем обработчик клика по крестику для закрытия галереи.
      // Специально, чтобы он не висел в памяти, когда не нужен.
      this._closeButton.removeEventListener('click', this._onCloseClick);

      // Удаляем обработчик клика мышкой на фотографию в галереи.
      this._photoImage.removeEventListener('click', this._onPhotoClick);

      // Удаляем обработчик нажатия на клавишу. Ловим Esc.
      window.removeEventListener('keydown', this._onDocumentKeyDown);

      location.hash = '';
    },

    /**
     * Принимает на вход массив фотографий из json и сохраняет его в объекте.
     *
     * @param {Array.<Object>} data
     */
    setPictures: function(data) {
      this._pictures = data;

      // Запускаем обработчик изменения hash, чтобы сразу показать
      // картинку, если переход был по прямой ссылке на картинку.
      this._onHashChange();
    },

    /**
     * Берет фотографию с переданным индексом из массива фотографий и
     * показывает ее в галерее, обновляя DOM-элемент .gallery-overlay:
     * меняет src у фотографии .gallery-overlay-image и выставляет
     * правильные количества лайков и комментариев в элементы
     * .gallery-overlay-controls-like и .gallery-overlay-controls-comments.
     *
     * @param {number} i
     */
    setCurrentPicture: function(i) {
      if (this._currentPictureNumber === i) {
        return;
      }

      this._currentPictureNumber = i;
      this.setHash(this._pictures[i].url);

      document.querySelector('.gallery-overlay-image').src = this._pictures[i].url;
      document.querySelector('.gallery-overlay-controls .likes-count').innerHTML = this._pictures[i].likes;
      document.querySelector('.gallery-overlay-controls .comments-count').innerHTML = this._pictures[i].comments;
    },

    /**
     * Устанавливаем хеш.
     * @param hash
     */
    setHash: function(hash) {
      location.hash = hash ? 'photo/' + hash : '';
    },

    /**
     * Метод находит индекс текущей фотографии по url
     * и возвращает его.
     * @param {string} index
     * @returns {number}
     * @private
     */
    _getPositionString: function(index) {
      if (typeof this._pictures !== 'undefined') {
        var length = this._pictures.length;

        for (var i = 0; i < length; i++) {
          if (this._pictures[i].url === index) {
            return i;
          }
        }
      }

      return -1;
    },

    /**
     * Проверка хеша на странице.
     * @private
     */
    _onHashChange: function() {
      this._hash = location.hash.match(/#photo\/(\S+)/);

      if (this._hash && this._hash[1] !== '') {
        var number = this._getPositionString(this._hash[1]);

        if (number !== -1) {
          this.setCurrentPicture(number);
          this.show();
        }
      } else {
        this.hide();
      }
    },

    /**
     * Обработчики события клика по крестику для скрытия галереи.
     * @private
     */
    _onCloseClick: function() {
      this.hide();
    },

    /**
     * Обработчики события клика по фотографии.
     * @private
     */
    _onPhotoClick: function() {
      if (this._pictures[this._currentPictureNumber + 1]) {
        this.setHash(this._pictures[this._currentPictureNumber + 1].url);
      }
    },

    /**
     * Вызываем закрытие галереи по нажатию Esc.
     * @private
     */
    _onDocumentKeyDown: function(evt) {
      if (evt.keyCode === 27) {
        this.hide();
      }
    }
  };

  return Gallery;
});
