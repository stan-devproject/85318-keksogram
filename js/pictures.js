'use strict';

(function() {

  // Форма с фильтрами списка фотографий.
  var filtersForm = document.querySelector('.filters');

  // Контейнер, куда сохраняются сгенерированные шаблоны.
  var container = document.querySelector('.pictures');

  // Массив, который будет хранить загруженный список картинок.
  var loadedPicturesData;

  // Таймаут ожидания загрузки, после которого загрузка считается несостоявшейся.
  var LOAD_TIMEOUT = 10000;

  /**
   * Функция, запускающая инициализацию модуля списка фотографий.
   */
  function picturesInitialize() {
    // Скрываем блок с фильтрами.
    picturesFiltersHide();

    // Устанавливаем обработчик, который следит за переключениями фильтров списка фотографий.
    filtersForm.onchange = function() {
      // Получаем текущее значение радиобаттона (т.е. имя фильтра, оно изменилось)
      var selectedFilter = [].filter.call(filtersForm['filter'], function(item) {
        return item.checked;
      })[0].value;

      setActivePictureFilter(selectedFilter);
    };

    // Генерируем и отображаем картинки на основе шаблонов.
    getPicturesAndRender();

    // Показываем блок с фильтрами.
    picturesFiltersShow();
  }

  /**
   * Установка выбранного фильтра картинок.
   */
  function setActivePictureFilter(selectedFilter) {
    // Если загруженный массив с картинками скачан.
    if (loadedPicturesData) {
      // Копирование массива.
      var filteredPictures = loadedPicturesData.slice(0);

      switch (selectedFilter) {
        case 'popular':
          // Массив остается такой же, так как с такой сортировкой
          // нам приходят данные с сервера.
          break;
        case 'new':
          filteredPictures.sort(function(a, b) {
            var aDate = new Date(a.date);
            var bDate = new Date(b.date);

            return bDate.getTime() - aDate.getTime();
          });
          break;
        case 'discussed':
          filteredPictures.sort(function(a, b) {
            return b.comments - a.comments;
          });
          break;
      }

      picturesRender(filteredPictures);
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
      var rawData = evt.target.response;
      loadedPicturesData = JSON.parse(rawData);
      picturesRender(loadedPicturesData);
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
   */
  function picturesRender(pictures) {
    // Очищаем содержимое контейнера.
    container.innerHTML = '';

    var fragment = document.createDocumentFragment();

    pictures.forEach(function(picture) {
      fragment.appendChild(getElementFromTemplate(picture));
    });

    // Данные сгенерированы успешно, убираем прелоадер, если он есть.
    if (container.classList.contains('pictures-loading')) {
      container.classList.remove('pictures-loading');
    }

    container.appendChild(fragment);
  }

  /**
   * Для каждого элемента создаем DOM-элемент на основе шаблона.
   */
  function getElementFromTemplate(data) {
    var template = document.querySelector('#picture-template');
    var element;

    if ('content' in template) {
      element = template.content.children[0].cloneNode(true);
    } else {
      // Мы имеем дело с IE.
      element = template.children[0].cloneNode(true);
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
    };

    // Обработчик ошибки при загрузке изображения.
    pictureImage.onerror = function() {
      if (!element.classList.contains('picture-load-failure')) {
        element.classList.add('picture-load-failure');
      }
    };

    // Обработчик ошибки, если сервер не отвечает из-за таймаута.
    var imageLoadTimeout = setTimeout(function() {
      // Прекращаем загрузку
      pictureImage.src = '';

      // Показываем ошибку.
      if (!element.classList.contains('picture-load-failure')) {
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
