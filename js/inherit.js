'use strict';

define(function() {
  /**
   * Функция принимает два конструктора и записывает в прототип
   * дочернего конструктора child методы и свойства родительского
   * конструктора parent через пустой конструктор.
   *
   * @param {object} Child
   * @param {object} Parent
   */
  var inherit = function(Child, Parent) {
    var EmptyConstructor = function() {};
    EmptyConstructor.prototype = Parent.prototype;
    Child.prototype = new EmptyConstructor();
  };

  return inherit;
});
