'use strict';

(function() {

  // Форма с фильтрами списка фотографий.
  var filtersForm = document.querySelector('.filters');

  // Контейнер, куда сохраняются сгенерированные шаблоны.
  var container = document.querySelector('.pictures');

  // Таймаут ожидания загрузки, после которого загрузка считается несостоявшейся.
  var LOAD_TIMEOUT = 10000;

  /**
   * Функция, запускающая инициализацию модуля списка фотографий.
   */
  function picturesInitialize() {
    // Скрываем блок с фильтрами.
    picturesFiltersHide();

    pictures.forEach(function(picture){
      container.appendChild(getElementFromTemplate(picture));
    });

    // Показываем блок с фильтрами.
    picturesFiltersShow();
  }

  /**
   * Для каждого элемента создаем DOM-элемент на основе шаблона.
   */
  function getElementFromTemplate(data) {
    var template = document.querySelector('#picture-template');

    if ('content' in template) {
      var element = template.content.children[0].cloneNode(true);
    } else {
      // Мы имеем дело с IE.
      var element = template.children[0].cloneNode(true);
    }

    element.querySelector('.picture-comments').textContent = data.comments.toString();
    element.querySelector('.picture-likes').textContent = data.likes.toString();

    var pictureImage = new Image();

    // Обработчик успешной загрузки изображения.
    pictureImage.onload = function() {
      // Отменяем таймаут, так как изображение успешно загрузилось.
      clearTimeout(imageLoadTimeout);

      pictureImage.width = 182;
      pictureImage.height = 182;

      element.replaceChild(pictureImage, element.querySelector('img'));
    }

    // Обработчик ошибки при загрузке изображения.
    pictureImage.onerror = function() {
      if (!element.classList.contains('picture-load-failure')){
        element.classList.add('picture-load-failure');
      }
    }

    // Обработчик ошибки, если сервер не отвечает из-за таймаута.
    var imageLoadTimeout = setTimeout(function() {
      // Прекращаем загрузку
      pictureImage.src = '';

      // Показываем ошибку.
      if (!element.classList.contains('picture-load-failure')){
        element.classList.add('picture-load-failure');
      }
    }, LOAD_TIMEOUT);

    // Запускаем загрузку изображения.
    pictureImage.src = data.url;

    return element;
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
