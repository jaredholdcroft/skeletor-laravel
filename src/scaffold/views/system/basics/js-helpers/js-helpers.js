import _ from 'lodash';
import domready from 'domready';
import jump from 'jump.js';

(function(){

  /**
   *  @namespace Helpers
   */

  const toggleTriggers = document.getElementsByClassName('js-toggle');
  const scrollToTriggers = document.getElementsByClassName('js-scrollto');
  const ajaxTriggers = document.getElementsByClassName('js-load-more');

  /**
   *  @function toggleElement
   *  @memberOf Helpers
   */

  function toggleElement(e){
    e.preventDefault();

    const target = document.getElementById(this.getAttribute('href').slice(1));
    const killOthers = document.getElementsByClassName(this.dataset.killothers);
    const activeClass = this.dataset.toggleclass;
    const triggerActiveClass = this.classList[0] + '--active';

    // If killOthers is set, we're turning off similar elements
    if(killOthers){

      // Turn off currently open elements
      Array.from(killOthers).forEach(other =>
        other.classList.remove(activeClass)
      );

      // Turn off currently open triggers
      Array.from(toggleTriggers).forEach(trigger =>
        trigger.classList.remove(triggerActiveClass)
      );
    }


    this.classList.toggle(triggerActiveClass);
    target.classList.toggle(activeClass);
  }

  /**
   *  @function scrollToContent
   *  @memberOf Helpers
   *  @param e {Event} click event
   */

  function scrollToContent(e) {
    e.preventDefault();
    const target = document.getElementById(this.getAttribute('href').substr(1));
    const duration = this.dataset.duration;

    setTimeout(function(){
      jump(target, {
        duration: duration || 500
      })
    }, 0);
  }

  /**
   *  @function checkIfNext
   *  @memberOf Helpers
   *  @param button {object} the button we're checking against
   */

   function checkIfNext(button) {
     fetch(button.getAttribute('href'))
       .then(function(response) {
         return response.text();
       }).then(function(body) {
         if(body.trim() === "<p class='no-more'>No more posts</p>"){
           button.classList.add('fadeOut');
         };
       });
   }

  /**
   *  @function loadAjaxContent
   *  @memberOf Helpers
   *  @param e {Event} click event
   */

   function loadAjaxContent(e) {
     e.preventDefault();

     const postWrapper = document.getElementById(this.getAttribute('data-target'));

     fetch(this.getAttribute('href'))
       .then(function(response) {
         return response.text();
       }).then(function(body) {
         postWrapper.insertAdjacentHTML('beforeend', body);
       });

     const pageLink = this.getAttribute("href").split('/');
     const nextPage = parseInt(pageLink.pop()) + 1;
     this.href = pageLink.join('/') + '/' + nextPage;

     checkIfNext(this);
   }

   /**
    *  @function highlightSearchTerms
    *  @memberOf Helpers
    *  @param term {string} what we're looking for
    */

  //  function highlightTerms(term){
  //     var searchResults = document.getElementsByClassName('highlightable');
   //
  //     for (var i = 0; i < searchResults.length; i++ ) {
  //       var srcStr = searchResults[i].innerHTML;
  //
  //       // Looks for the term and wraps it with <em> so that it can be styled
  //       var term = term.replace(/(\s+)/,"(<[^>]+>)*$1(<[^>]+>)*");
  //       var pattern = new RegExp("("+term+")", "gi");
  //       srcStr = srcStr.replace(pattern, "<em>$1</em>");
  //       srcStr = srcStr.replace(/(<em>[^<>]*)((<[^>]+>)+)([^<>]*<\/em>)/,"$1</em>$2<em>$4");
  //       searchResults[i].innerHTML = srcStr;
  //     }
  //   }

  domready(() => {
    Array.from(toggleTriggers).forEach(trigger =>
      trigger.addEventListener('click', toggleElement)
    );

    Array.from(scrollToTriggers).forEach(link =>
      link.addEventListener('click', scrollToContent, false)
    );

    Array.from(ajaxTriggers).forEach(trigger =>
      trigger.addEventListener('click', loadAjaxContent)
    );

    // highlightTerms(term); WIP
  })

})();
