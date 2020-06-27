import qs from 'qs'

(function(){

  /**
   *  @namespace LibraryControls
   */

  const libResizers = document.getElementsByClassName('library__sizer-link');
  const libWrap = document.getElementById('library-wrap');
  const libNavTrigger = document.getElementById('library-nav-trigger');
  const libOuter = document.getElementById('library-outer');
  const libNav = document.getElementById('library-nav');
  const libNavItems = document.getElementsByClassName('updates-content');
  const libNavItemParents = document.getElementsByClassName('library__nav-link--parent');
  const libIndexButton = document.getElementById('library-index');
  const libIframe = document.getElementById('library-content');

  /**
   * @function resizeContent
   * @memberOf LibraryControls
   */

  function resizeContent(e){
    e.preventDefault();

    // Update wrapper with new size
    const newSize = this.getAttribute('href').substr(1);
    libWrap.className = "";
    libWrap.classList.add('library__content-inner');
    libWrap.classList.add('library__content-inner--' + newSize);

    // Update nav with current size
    Array.from(libResizers).forEach(size =>
      size.classList.remove('current')
    );
    this.classList.add('current');
  }

  /**
   * @function toggleLibNav
   * @memberOf LibraryControls
   */

  function toggleLibNav(e) {
    e.preventDefault();
    libNav.classList.toggle('library__nav--active');
    libOuter.classList.toggle('library--active')
    this.classList.toggle('is-active');
  }

  /**
   * @function updateComponent
   * @memberOf LibraryControls
   */

  function updateComponent(e) {
    e.preventDefault();
    const newModule = this.getAttribute('href');
    libIframe.src = newModule;
    //  scroll to top of page
    window.scroll(0, 0)

    // keep track of current component
    var queries = qs.parse(newModule.substr(1))
    window.history.pushState(queries, null, `#${queries.type}-${queries.component}`)
  }


  /**
   * @function toggleSubNav
   * @memberOf LibraryControls
   */

  function toggleSubNav(e) {
    e.preventDefault();
    const targetSubNav = document.getElementById(this.getAttribute('href').substr(1));
    targetSubNav.classList.toggle('active');
  }


  window.onload = function() {

    if(window.location.hash) {
      const component = window.location.hash.substr(1)
      const link =
        document
          .querySelector(`.library__nav-link[data-component=${component}]`)
      libIframe.src = link.href
    }

    Array.from(libResizers).forEach(size =>
      size.addEventListener('click', resizeContent)
    );

    Array.from(libNavItems).forEach(navItem =>
      navItem.addEventListener('click', updateComponent)
    );

    Array.from(libNavItemParents).forEach(navItemParent =>
      navItemParent.addEventListener('click', toggleSubNav)
    );

    if(libNavTrigger){
      libNavTrigger.addEventListener('click', toggleLibNav);
    }

    if(libIndexButton){
      libIndexButton.addEventListener('click', updateComponent);
    }

  }

})();
