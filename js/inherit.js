'use strict';

/**
 * Функция принимает два конструктора и записывает в прототип
 * дочернего конструктора child методы и свойства родительского
 * конструктора parent через пустой конструктор.
 *
 * @param {function} Child
 * @param {function} Parent
 */
function inherit(Child, Parent) {
  var EmptyConstructor = function() {};
  EmptyConstructor.prototype = Parent.prototype;
  Child.prototype = new EmptyConstructor();
}
