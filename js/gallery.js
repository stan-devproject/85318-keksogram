'use strict';

(function() {
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
  };

  /**
   * Показ галереи.
   */
  Gallery.prototype.show = function() {
    this.element.classList.remove('invisible');

    // Добавляем обработчик клика по крестику для закрытия галереи.
    this._closeButton.addEventListener('click', this._onCloseClick);

    // Добавляем обработчик клика мышкой на фотографию в галереи.
    this._photoImage.addEventListener('click', this._onPhotoClick);

    // Добавляем обработчик нажатия на клавишу. Ловим Esc.
    window.addEventListener('keydown', this._onDocumentKeyDown);
  };

  /**
   * Скрытие галереи.
   */
  Gallery.prototype.hide = function() {
    this.element.classList.add('invisible');

    // Удаляем обработчик клика по крестику для закрытия галереи.
    // Специально, чтобы он не висел в памяти, когда не нужен.
    this._closeButton.removeEventListener('click', this._onCloseClick);

    // Удаляем обработчик клика мышкой на фотографию в галереи.
    this._photoImage.removeEventListener('click', this._onPhotoClick);

    // Удаляем обработчик нажатия на клавишу. Ловим Esc.
    window.removeEventListener('keydown', this._onDocumentKeyDown);
  };

  /**
   * Обработчики события клика по крестику для скрытия галереи.
   * @private
   */
  Gallery.prototype._onCloseClick = function() {
    this.hide();
  };

  /**
   * Обработчики события клика по фотографии.
   * @private
   */
  Gallery.prototype._onPhotoClick = function() {};

  /**
   * Вызываем закрытие галереи по нажатию Esc.
   * @private
   */
  Gallery.prototype._onDocumentKeyDown = function(evt) {
    if (evt.keyCode === 27) {
      this.hide();
    }
  };

  window.Gallery = Gallery;
})();
