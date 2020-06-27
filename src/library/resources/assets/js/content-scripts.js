'use strict';

(function () {

  /**
   *  @namespace ContentControls
   */

  var iframe = window.parent.document.getElementById('library-content');
  var extLibNavItems = window.parent.document.getElementsByClassName('updates-content');
  var extLibIndexButton = window.parent.document.getElementById('library-index');
  var container = document.getElementById('library-wrap');
  var codeTriggers = document.getElementsByClassName('library__code-trigger');
  var currentComponent = document.body.getAttribute('data-component');

  /**
   * @function resizeIFrame
   * @memberOf ContentControls
   */

  function resizeIframe() {
    iframe.style.height = container.offsetHeight + 'px';
  }

  /**
   * @function toggleCodeWindow
   * @memberOf ContentControls
   */

  function toggleCodeWindow(e) {
    e.preventDefault();
    var targetCodePane = document.getElementById(this.getAttribute('href').substr(1));
    targetCodePane.classList.toggle('active');
    this.classList.toggle('active');

    // Wait a minute since we're
    // animating the open/close
    setTimeout(function () {
      resizeIframe();
    }, 400);
  }

  /**
   * @function updateSideNav
   * @memberOf ContentControls
   */

  function updateSideNav(navItem) {
    navItem.classList.remove('current');
    extLibIndexButton.classList.remove('current');

    if (navItem.getAttribute('data-component') === currentComponent) {
      navItem.classList.add('current');
    } else if (currentComponent === "intro-") {
      extLibIndexButton.classList.add('current');
    }
  }

  window.onload = function () {
    resizeIframe();

    Array.from(extLibNavItems).forEach(function (navItem) {
      return updateSideNav(navItem);
    });

    Array.from(codeTriggers).forEach(function (trigger) {
      return trigger.addEventListener('click', toggleCodeWindow);
    });
  };

  // Using setTimeout to prevent
  // it from firing twice
  var res = void 0;
  window.onresize = function () {
    if (res) {
      clearTimeout(res);
    };
    res = setTimeout(function () {
      resizeIframe();
    }, 100);
  };
})();