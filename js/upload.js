/* global Resizer: true */

/**
 * @fileoverview
 * @author Igor Alexeenko (o0)
 */

'use strict';

define([
  'resizer'
], function() {
  /** @enum {string} */
  var FileType = {
    'GIF': '',
    'JPEG': '',
    'PNG': '',
    'SVG+XML': ''
  };

  /** @enum {number} */
  var Action = {
    ERROR: 0,
    UPLOADING: 1,
    CUSTOM: 2
  };

  /**
   * Регулярное выражение, проверяющее тип загружаемого файла. Составляется
   * из ключей FileType.
   * @type {RegExp}
   */
  var fileRegExp = new RegExp('^image/(' + Object.keys(FileType).join('|').replace('\+', '\\+') + ')$', 'i');

  /**
   * @type {Object.<string, string>}
   */
  var filterMap = {
    'none': 'filter-none',
    'chrome': 'filter-chrome',
    'sepia': 'filter-sepia'
  };

  /**
   * Фильтр по умолчанию. Указывается ключ массива filterMap.
   * @const
   * @type {number}
   */
  var FILTER_DEFAULT_KEYMAP = 'none';

  /**
   * Объект, который занимается кадрированием изображения.
   * @type {Resizer}
   */
  var currentResizer;

  /**
   * Поле "Слева".
   * @type {HTMLElement}
   */
  var formInputResizeX = document.getElementById('resize-x');

  /**
   * Поле "Сверху".
   * @type {HTMLElement}
   */
  var formInputResizeY = document.getElementById('resize-y');

  /**
   * Поле "Сторона".
   * @type {HTMLElement}
   */
  var formInputResizeSize = document.getElementById('resize-size');

  /**
   * Кнопка-значек "Вперед".
   * @type {HTMLElement}
   */
  var formControlButtonFwd = document.getElementById('resize-fwd');

  /**
   * Удаляет текущий объект {@link Resizer}, чтобы создать новый с другим
   * изображением.
   */
  function cleanupResizer() {
    if (currentResizer) {
      currentResizer.remove();
      currentResizer = null;
    }
  }

  /**
   * Ставит одну из трех случайных картинок на фон формы загрузки.
   */
  function updateBackground() {
    var images = [
      'img/logo-background-1.jpg',
      'img/logo-background-2.jpg',
      'img/logo-background-3.jpg'
    ];

    var backgroundElement = document.querySelector('.upload');
    var randomImageNumber = Math.round(Math.random() * (images.length - 1));
    backgroundElement.style.backgroundImage = 'url(' + images[randomImageNumber] + ')';
  }

  /**
   * Проверяет, валидны ли данные, в форме кадрирования.
   * То есть все проверки формы в одном месте.
   * @return {boolean}
   */
  function resizeFormIsValid() {
    return (resizeFormInputXIsValid() && resizeFormInputYIsValid() && resizeFormInputSizeIsValid());
  }

  /**
   * Проверка, валидно ли поле "Слева".
   * @returns {boolean}
   */
  function resizeFormInputXIsValid() {
    if (formInputResizeX.value === '') {
      return false;
    }

    if (isNaN(Number(formInputResizeX.value))) {
      return false;
    }

    if (!(/[0-9]+/.test(formInputResizeX.value))) {
      return false;
    }

    if (Number(formInputResizeX.value) < 0) {
      return false;
    }

    if ((Number(formInputResizeX.value) + Number(formInputResizeSize.value)) > currentResizer._image.naturalWidth) {
      return false;
    }

    return true;
  }

  /**
   * Проверка, валидно ли поле "Сверху".
   * @returns {boolean}
   */
  function resizeFormInputYIsValid() {
    if (formInputResizeY.value === '') {
      return false;
    }

    if (isNaN(Number(formInputResizeY.value))) {
      return false;
    }

    if (!(/[0-9]+/.test(formInputResizeY.value))) {
      return false;
    }

    if (Number(formInputResizeY.value) < 0) {
      return false;
    }

    if ((Number(formInputResizeY.value) + Number(formInputResizeSize.value)) > currentResizer._image.naturalHeight) {
      return false;
    }

    return true;
  }

  /**
   * Проверка, валидно ли поле "Сторона".
   * @returns {boolean}
   */
  function resizeFormInputSizeIsValid() {
    if (formInputResizeSize === '') {
      return false;
    }

    if (isNaN(Number(formInputResizeSize.value))) {
      return false;
    }

    if (!(/[0-9]+/.test(formInputResizeSize.value))) {
      return false;
    }

    if ((Number(formInputResizeSize.value) <= 0)) {
      return false;
    }

    return true;
  }

  /**
   * Отмечаем конкретный инпут, как ошибочный.
   * Добавляем ему класс, который через CSS делает поле красным.
   * @param formInput
   */
  function setErrorMessage(formInput) {
    if (!formInput.classList.contains('js-input-error')) {
      formInput.classList.add('js-input-error');
    }
  }

  /**
   * Возвращаем инпут в обычное состояние.
   * Убираем у инпута класс, который через CSS делает поле красным.
   * @param formInput
   */
  function removeErrorMessage(formInput) {
    if (formInput.classList.contains('js-input-error')) {
      formInput.classList.remove('js-input-error');
    }
  }

  /**
   * Проверка, валидно ли поле "Слева".
   * Если валидно, то изменяем месторасположение обрезающей рамки.
   * @returns {boolean}
   */
  function checkResizeFormValidity() {
    if (!resizeFormInputXIsValid()) {
      setErrorMessage(formInputResizeX);
    } else {
      removeErrorMessage(formInputResizeX);

      currentResizer.setConstraintX(Number(formInputResizeX.value));
    }

    if (!resizeFormInputYIsValid()) {
      setErrorMessage(formInputResizeY);
    } else {
      removeErrorMessage(formInputResizeY);

      currentResizer.setConstraintY(Number(formInputResizeY.value));
    }

    if (!resizeFormInputSizeIsValid()) {
      setErrorMessage(formInputResizeSize);
    } else {
      removeErrorMessage(formInputResizeSize);

      currentResizer.setConstraintSide(Number(formInputResizeSize.value));
    }

    if (resizeFormIsValid()) {
      formControlButtonFwd.disabled = '';
    } else {
      formControlButtonFwd.disabled = 'disabled';
    }
  }

  /**
   * Форма загрузки изображения.
   * @type {HTMLFormElement}
   */
  var uploadForm = document.forms['upload-select-image'];

  /**
   * Форма кадрирования изображения.
   * @type {HTMLFormElement}
   */
  var resizeForm = document.forms['upload-resize'];

  /**
   * Форма добавления фильтра.
   * @type {HTMLFormElement}
   */
  var filterForm = document.forms['upload-filter'];

  /**
   * @type {HTMLImageElement}
   */
  var filterImage = filterForm.querySelector('.filter-image-preview');

  /**
   * @type {HTMLElement}
   */
  var uploadMessage = document.querySelector('.upload-message');

  /**
   * @param {Action} action
   * @param {string=} message
   * @return {Element}
   */
  function showMessage(action, message) {
    var isError = false;

    switch (action) {
      case Action.UPLOADING:
        message = message || 'Кексограмим&hellip;';
        break;

      case Action.ERROR:
        isError = true;
        message = message || 'Неподдерживаемый формат файла<br> <a href="' + document.location + '">Попробовать еще раз</a>.';
        break;
    }

    uploadMessage.querySelector('.upload-message-container').innerHTML = message;
    uploadMessage.classList.remove('invisible');
    uploadMessage.classList.toggle('upload-message-error', isError);
    return uploadMessage;
  }

  function hideMessage() {
    uploadMessage.classList.add('invisible');
  }

  /**
   * Обработчик изменения изображения в форме загрузки. Если загруженный
   * файл является изображением, считывается исходник картинки, создается
   * Resizer с загруженной картинкой, добавляется в форму кадрирования
   * и показывается форма кадрирования.
   * @param {Event} evt
   */
  uploadForm.addEventListener('change', function(evt) {
    var element = evt.target;
    if (element.id === 'upload-file') {
      // Проверка типа загружаемого файла, тип должен быть изображением
      // одного из форматов: JPEG, PNG, GIF или SVG.
      if (fileRegExp.test(element.files[0].type)) {
        var fileReader = new FileReader();

        showMessage(Action.UPLOADING);

        fileReader.onload = function() {
          cleanupResizer();

          currentResizer = new Resizer(fileReader.result, formInputResizeX, formInputResizeY, formInputResizeSize);
          currentResizer.setElement(resizeForm);
          uploadMessage.classList.add('invisible');

          uploadForm.classList.add('invisible');
          resizeForm.classList.remove('invisible');

          hideMessage();
        };

        fileReader.readAsDataURL(element.files[0]);
      } else {
        // Показ сообщения об ошибке, если загружаемый файл, не является
        // поддерживаемым изображением.
        showMessage(Action.ERROR);
      }
    }
  });

  /**
   * Обработка сброса формы кадрирования. Возвращает в начальное состояние
   * и обновляет фон.
   * @param {Event} evt
   */
  resizeForm.addEventListener('reset', function(evt) {
    evt.preventDefault();

    cleanupResizer();
    updateBackground();

    resizeForm.classList.add('invisible');
    uploadForm.classList.remove('invisible');
  });

  /**
   * Возвращает значение фильтра по умолчанию.
   * Возвращаемая строка - это ключ в массиве filterMap.
   * @returns {string}
   */
  function getDefaultFilter() {
    var cookieFilter = docCookies.getItem('filterMapKey');

    if (cookieFilter && filterMap[cookieFilter]) {
      return cookieFilter;
    }

    // Иначе возвращается фильтр по умолчанию.
    return FILTER_DEFAULT_KEYMAP;
  }

  /**
   * Устанавливает текущий фильтр, включая переключение radio-input`ов.
   * @param {filterMap} filterMapKey
   */
  function setFilter(filterMapKey) {
    for (var i = 0; i < filterForm['upload-filter'].length; i++) {
      if (filterForm['upload-filter'][i].value === filterMapKey) {
        filterForm['upload-filter'][i].checked = 'checked';
      } else {
        filterForm['upload-filter'][i].checked = '';
      }
    }

    // Класс перезаписывается, а не обновляется через classList потому что нужно
    // убрать предыдущий примененный класс. Для этого нужно или запоминать его
    // состояние или просто перезаписывать.
    filterImage.className = 'filter-image-preview ' + filterMap[filterMapKey];

    // Сохранение в cookies выбранного фильтра.
    // Соответственно всегда будет устанавливаться последний выбранный тип.
    docCookies.setItem('filterMapKey', filterMapKey, getCookieExpiredDate());
  }

  /**
   * Возвращает дату, когда cookies перестают действовать.
   * В соответствии с ТЗ это количество дней, прошедшее с ближайшего дня рождения.
   */
  function getCookieExpiredDate() {

    // Дата последнего дня рождения.
    var timeLastBirthday;

    if (((new Date()).getMonth() <= 1) && (((new Date()).getDate() < 12))) {
      // В текущем году день рождения еще не наступал.
      // Значит считаем дни, прошедшие с прошлогоднего дня рождения.
      timeLastBirthday = new Date(((new Date()).getFullYear() - 1), 1, 12);

    } else {
      // В текущем году уже наступил день рождения.
      // Значит считаем дни, прошедшие с дня рождения в этом году.
      timeLastBirthday = new Date((new Date()).getFullYear(), 1, 12);
    }

    // Разница в милисекундах между текущим временем и последним днем рождения.
    var timeLeftFromLastBirthday = (new Date()).getTime() - timeLastBirthday.getTime();

    // Переводим прошедшее время в дни и округляем.
    // Было требование посчитать именно дни.
    var daysLeftFromLastBirthday = Math.round(timeLeftFromLastBirthday / (24 * 60 * 60));

    // Считаем срок действия cookie: текущее время + дни с последнего дня рождения, умноженные на секунды в сутках.
    var timeCookieExpired = (new Date()).getTime() + (daysLeftFromLastBirthday * (24 * 60 * 60));

    return (new Date()).setTime(timeCookieExpired);
  }

  /**
   * Обработка отправки формы кадрирования. Если форма валидна, экспортирует
   * кропнутое изображение в форму добавления фильтра и показывает ее.
   * @param {Event} evt
   */
  resizeForm.addEventListener('submit', function(evt) {
    evt.preventDefault();

    if (resizeFormIsValid()) {
      filterImage.src = currentResizer.exportImage().src;

      resizeForm.classList.add('invisible');
      filterForm.classList.remove('invisible');

      // Инициализируем фильтр.
      // Либо по умолчанию 'оригинал', либо из cookies последний использовавшийся.
      setFilter(getDefaultFilter());
    }
  });

  /**
   * Сброс формы фильтра. Показывает форму кадрирования.
   * @param {Event} evt
   */
  filterForm.addEventListener('reset', function(evt) {
    evt.preventDefault();

    filterForm.classList.add('invisible');
    resizeForm.classList.remove('invisible');
  });

  /**
   * Отправка формы фильтра. Возвращает в начальное состояние, предварительно
   * записав сохраненный фильтр в cookie.
   * @param {Event} evt
   */
  filterForm.addEventListener('submit', function(evt) {
    evt.preventDefault();

    cleanupResizer();
    updateBackground();

    filterForm.classList.add('invisible');
    uploadForm.classList.remove('invisible');
  });

  /**
   * Обработчик изменения фильтра. Добавляет класс из filterMap соответствующий
   * выбранному значению в форме.
   */
  filterForm.addEventListener('change', function() {
    // Получаем текущее значение радиобаттона (т.е. имя фильтра, оно изменилось)
    var selectedFilter = [].filter.call(filterForm['upload-filter'], function(item) {
      return item.checked;
    })[0].value;

    // Изменяем фильтр на текущее значение радиобаттона. (т.е. только что выбранный)
    setFilter(selectedFilter);
  });

  window.addEventListener('resizerchange', function() {
    var currentConstraint = currentResizer.getConstraint();

    formInputResizeSize.value = currentConstraint.side.toString();

  });

  // Устанавливаем обработчики для отслеживания валидности формы.
  formInputResizeX.addEventListener('change', checkResizeFormValidity);
  formInputResizeY.addEventListener('change', checkResizeFormValidity);
  formInputResizeSize.addEventListener('change', checkResizeFormValidity);

  cleanupResizer();
  updateBackground();
});
