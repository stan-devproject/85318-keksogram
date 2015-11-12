'use strict';

function getMessage(imageType, imageCount) {
  if (typeof imageType === 'boolean') {
      if (imageType) {
        return 'Переданное GIF-изображение анимировано и содержит ' + imageCount + ' кадров';
      } else {
        return 'Переданное GIF-изображение не анимировано';
      }

  } else if (typeof imageType === 'number') {
      return 'Переданное SVG-изображение содержит ' + imageType + ' объектов и ' + (imageCount * 4) + ' аттрибутов';

  } else if ((typeof imageType === 'object') && (typeof imageCount === 'object')) {
      if ((Array.isArray(imageType) && Array.isArray(imageCount)) && (imageType.length === imageCount.length)) {
        // Перемножаем элементы массивов друг с другом и считаем их сумму в sum
        for (var sum = 0, i = 0; i < imageType.length; sum += imageType[i] * imageCount[i], i++);
        return 'Общая площадь артефактов сжатия: ' + sum + ' пикселей';
      } else {
        return 'Упс, у нас не получилось выполнить подсчеты.';
      }

  } else if (typeof imageType === 'object') {
      if (Array.isArray(imageType)) {
        // Сумма значений переданного массива
        for (var sum = 0, i = 0; i < imageType.length; sum += imageType[i], i++);
        return 'Количество красных точек во всех строчках изображения: ' + sum;
      } else {
        return 'Упс, у нас не получилось выполнить подсчеты.';
      }

  } else {
      return 'Упс, у нас не получилось выполнить подсчеты.';
  }
}
