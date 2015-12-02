'use strict';

(function() {

  // Форма с фильтрами списка фотографий.
  var filtersForm = document.querySelector('.filters');

  // Контейнер, куда сохраняются сгенерированные шаблоны.
  var container = document.querySelector('.pictures');

  // Массив, который будет хранить загруженный список картинок.
  var loadedPicturesData = [];

  // Массив, который будет хранить отсортированный (выбранным фильтром) список картинок.
  var filteredPicturesData = [];

  // Текущая страница при выдаче списка фотографий.
  var currentPage = 0;

  // Количество изображений на одной странице.
  var PAGE_SIZE = 12;

  // Таймаут ожидания загрузки, после которого загрузка считается несостоявшейся.
  var LOAD_TIMEOUT = 10000;

  // Таймаут тротлинга для оптимизации нагрузки (используется в обработчике скролла)
  var THROTTLE_TIMEOUT = 100;

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
      // Получаем цель, изменение которой вызвало событие.
      var selectedFilter = evt.target;

      // При условии, если эта цель - радиобаттон.
      if (selectedFilter.classList.contains('filters-radio')) {
        // Устанавливаем новый активный фильтр.
        // Внутри функции отрендеривается с нуля первая страница с изображениями.
        // И дальше страница заполняется другими изображениями (добавляются еще страницы), если еще есть место.
        // и до тех пор, пока есть что показывать.
        setActivePictureFilter(selectedFilter);
      }
    });

    // Устанавливаем обработчик изменения скролла для отрисовки новых страниц с изображениями.
    // Это оптимизация (тротлинг), чтобы слишком часто не вызывалась данная функция.
    var scrollTimeout;
    window.addEventListener('scroll', function(evt) {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(autoLoadPictures, THROTTLE_TIMEOUT);
    });
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

      // Обнуляем текущую страницу.
      currentPage = 0;

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

      // Сортировка по умолчанию такая же, как и во входных данных.
      filteredPicturesData = loadedPicturesData.slice(0);

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
   */
  function picturesRender(pictures, pageNumber, replace) {
    if (replace) {
      // Очищаем содержимое контейнера.
      container.innerHTML = '';
    }

    var fragment = document.createDocumentFragment();

    var from = pageNumber * PAGE_SIZE;
    var to = from + PAGE_SIZE;
    var pagePictures = pictures.slice(from, to);

    pagePictures.forEach(function(picture) {
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
