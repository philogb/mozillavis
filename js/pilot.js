/*!
 * Copyright Nicolas Garcia Belmonte and Maria Luz Caballero
 * 
 * License: Creative Commons Attribution-ShareAlike 3.0 license.
 */

var labelType, useGradients, nativeTextSupport, animate, cushion;

(function() {
  var ua = navigator.userAgent,
      iStuff = ua.match(/iPhone/i) || ua.match(/iPad/i),
      isFF = !(!document.getBoxObjectFor && window.mozInnerScreenX == null),
      typeOfCanvas = typeof HTMLCanvasElement,
      nativeCanvasSupport = (typeOfCanvas == 'object' || typeOfCanvas == 'function'),
      textSupport = nativeCanvasSupport 
        && (typeof document.createElement('canvas').getContext('2d').fillText == 'function');
  //I'm setting this based on the fact that ExCanvas provides text support for IE
  //and that as of today iPhone/iPad current text support is lame
  labelType = (!nativeCanvasSupport || (textSupport && !iStuff))? 'Native' : 'HTML';
  nativeTextSupport = labelType == 'Native';
  useGradients = nativeCanvasSupport;
  animate = !(iStuff || !nativeCanvasSupport);
  cushion = !isFF;
})();

var json, 
    morphing = false, 
    clicked = 0,
    root = false,
    charts = {},
    colors = [[49, 54, 149], [69, 117, 180], [116, 173, 209], [171, 217, 233], [224, 243, 248], 
              [254, 224, 144], [253, 174, 97], [244, 109, 67], [215, 48, 39], [165, 0, 38]];


function init() {
  var script = document.createElement('script');
  script.src = 'pilot.json';
  script.onload = function() {
    initViz();
  };
  document.getElementsByTagName('head')[0].appendChild(script);
}

function initMenu() {
  var nav = $jit.id('nav'),
      data = {
        /*
        'gender': {
          'title': 'Gender',
          'data': ['Male', 'Female']
        },
        */
        'howlong_ff': {
          'title': 'Time using Firefox',
/*          'data': ['< 3 months', '3 - 6 months', '6 months - 1 year', 
                   '1 - 2 years', '2 - 3 years', '3 - 5 years', '> 5 years'],*/
          'data': ['< 1 year', '1 - 3 years', '3 - 5 years', '> 5 years']
        },
        'net_access': {
          'title': 'Where FF is used',
          'data': ['Home', 'Work', 'School', 'Mobile']
        },
        'other_browsers': {
          'title': 'Browser use habits',
          'data': ['Only uses Firefox', 'Uses other Browsers']
        }
     };
  function createLi(ul, key, text) {
    var li = document.createElement('li');
    if (text) {
      li.innerHTML = text;
      li.className = 'title';
    }
    if (key) {
      li.className = 'button';
      li.addEventListener('click', function() {
        if (li.className != 'button' || tm.busy || morphing) {
          return;
        }
        morphing = true;
        var s = document.querySelectorAll('li.selected'),
            l = s.length;
        for(var i = 0; i < l; i++) {
          s[i].className = 'button';
        }
       li.className = 'selected';
        tm.op.morph(json[key], {
          type: 'fade:con',
          duration: 1200,
          fps: 60,
          hideLabels: false,
          onComplete: function() { 
            setTimeout(function() {
              if (clicked) {
                if (tm.clickedNode._depth == 2) {
                  tm.controller.onBeforePlotNode(tm.clickedNode, 1);
                } else {
                  tm.clickedNode.eachSubnode(function(n) {
                    tm.controller.onBeforePlotNode(n, 1);
                    tm.labels.getLabel(n.id).querySelectorAll('.pie-chart')[0].className = 'pie-chart';
                  });
                }
             }
              morphing = false;
            }, 100);
          }
        }, {
          'position': 'linear',
          'node-property': ['width', 'height', 'color']
        });
      }, false);
    }
    ul.appendChild(li);
    return li;
  }
  
  var col, ul;
  function createNewColumn() {
    col = document.createElement('div'),
    ul = document.createElement('ul');
    col.className = 'col';
    col.appendChild(ul);
    nav.appendChild(col);
    return col;
  }
  
  //insert all
  var ni = 0;
  createNewColumn();
  var main = createLi(ul, 'all', 'Reset all Filters');
  main.id = 'unselect-all';
  for (var n in data) {
    var col = createNewColumn();
    var value = data[n],
        items = value.data;
    createLi(ul, false, value.title);
    ni = 0;
    items.forEach(function(it, i) {
      createLi(ul, n + '_' + i, it);
    });
  }
}

function createPieChartJSON(node, width, height) {
  var beginner = 0,
      familiar = 0,
      expert = 0,
      all = 0,
      min = Math.min(width, height);
  node.data.skill_arr.forEach(function(n, i) {
    if (i <= 3) {
      beginner += +n;
    } else if (i <= 6) {
      familiar += +n;
    } else {
      expert += +n;
    }
  });
  all = beginner + familiar + expert;
  
  //TODO(nico): bug fix this in the pie chart!
  if (beginner === 0) beginner = 0.0001;
  if (familiar === 0) familiar = 0.0001;
  if (expert === 0) expert = 0.0001;

  return {
    'label': 'Skills distribution',
    'color': ['#313695', '#FEE090', '#A50026'],
    'values': [
      {
        'label': (min > 200? 'Expert ' : '') + Math.round(expert / all * 100) + '%',
        'values': expert
      },
      {
        'label': (min > 200? 'Familiar ' : '') + Math.round(familiar / all * 100) + '%',
        'values': familiar
      },
      {
        'label': (min > 200? 'Beginner ' : '') + Math.round(beginner / all * 100) + '%',
        'values': beginner
      }
   ]
  };
}

function initViz(){
  // remove loading panel
  var det = $jit.id('loading');
  det.parentNode.removeChild(det);

  $jit.id('go-to-parent').addEventListener('click', function(e) {
    e.preventDefault && e.preventDefault();
    e.stopPropagation && e.stopPropagation();
    tm.config.Events.onRightClick();
    return false;
  }, false);
  
  initMenu();

  tm = new $jit.TM.Squarified({
    // id of the visualization container
    injectInto: 'infovis',
    // whether to add transition animations
    animate: animate,
    // nodes offset
    offset: 0.2,
    // whether to add cushion type nodes
    cushion: cushion,
    //show only three levels at a time
    constrained: true,
    levelsToShow: 3,
    //parent node height
    titleHeight: 20,
    //fps: 40,
    // enable tips
    Tips: {
      enable: true,
      type: 'Native',
      // add positioning offsets
      offsetX: 20,
      offsetY: 20,
      // implement the onShow method to
      // add content to the tooltip when a node
      // is hovered
      onShow: function(tip, node){
        var pars = node.getParents();
        if (!pars.length) {
          tip.style.visibility = 'hidden';
          return;
        }
        
        tip.style.visibility = 'visible';
        
        // add tooltip info
        tip.innerHTML = "<div class=\"tip-title\">" + node.name
            + "</div><div class=\"tip-text\">" + node.data.perc + "% of UI interactions happen here" 
            + "<br />The average skill level for people using this UI is " 
            + ((node.data.skills) + "/10");
      }
    },
    // Add events to nodes
    Events: {
      enable: true,
      onClick: function(node){
        //hide tips and selections
        if (morphing) return;
        tm.tips.hide();
        if (node) {
          if (node._depth == 2 && (!tm.clickedNode || tm.clickedNode._depth == 0)) {
            node = node.getParents()[0];
          }
          clicked = node._depth;
          root = node.id;
          tm.enter(node);
        }
      },
      onRightClick: function(){
        if (morphing) return;
        //hide tips and selections
        tm.tips.hide();
        clicked = Math.max(0, clicked -1);
        var cn = tm.clickedNode;
        if (cn) {
          cn = tm.clickedNode.getParents()[0];
        }
        root = cn || false;
        //perform the out animation
        tm.out();
      }
    },
    // Add canvas label styling
    Label: {
      type: 'HTML', // "Native" or "HTML"
      size: 15
    },
    Node: {
      color: '#444'
    },
    // Add the name of the node in the corresponding label
    // This method is called once, on label creation and only for DOM and not
    // Native labels.
    onCreateLabel: function(domElement, node){
      if (node._depth <= 1) {
        domElement.innerHTML = '<em>' + node.name + '</em>';
      } else {
        domElement.innerHTML = '<div class=\'pie-wrapper\'>'
          + '<div class=\'leaf-text-wrapper\'>'
          + '<div class=\'leaf-text\'>' + node.name + '</div></div>'
          + '<div id=\'' + node.id + '-pie' + '\' class=\'pie-chart\'></div></div>';
      }
      var style = domElement.style;
      style.fontSize = '12px';
      style.display = '';
      style.cursor = 'pointer';
      style.overflow = 'hidden';
   },

   onBeforePlotNode: function(node, p) {
    if (charts[node.id] && (!morphing || p === 1)) {
      var pc = charts[node.id],
          width = node.getData('width', 'end'),
          height = node.getData('height', 'end'),
          cwidth = node.getData('width'),
          cheight = node.getData('height');
      if (clicked && pc && node.getData('alpha', 'end') && (width != cwidth || height != cheight) || p === 1) {
        pc.canvas.resize(width, height);
        pc.sb.config.levelDistance = Math.max(1, Math.min(width, height) - 40) /2;
        pc.loadJSON(createPieChartJSON(node, width, height));
     }
    }
  },

   onPlaceLabel: function(domElement, node) {
    if (node._depth == 2) {
      var width = node.getData('width', 'end'),
          height = node.getData('height', 'end'),
          cwidth = node.getData('width'),
          div = domElement.querySelectorAll('div.pie-chart')[0],
          divText = domElement.querySelectorAll('div.leaf-text-wrapper')[0],
          divTextStyle = divText.style,
          divStyle = div.style;

      divStyle.width = width + 'px';
      divStyle.height = height + 'px';
      divTextStyle.width = cwidth + 'px';
     if (clicked && node.data.skill_arr && !charts[node.id] && root && node.isDescendantOf(root)) {
       var pc = charts[node.id] = new $jit.PieChart({
         injectInto: div,
         animate: false,
         type: 'stacked:gradient',
         showLabels: true,
         hoveredColor: false,
         Label: {
          size: 11
         }
       });
       pc.loadJSON(createPieChartJSON(node, width, height));
     }
     if (width < 50 || height < 50 
        || (morphing && (!tm.clickedNode || tm.clickedNode._depth != 2)) 
        || clicked == 0 || node.getData('alpha', 'end') == 0) {
        div.className = 'pie-chart hidden';
     } else {
        div.className = 'pie-chart';
     }
   }
  },

  fps: 50
  
  });
  tm.reposition = function() { tm.compute('end'); };
  // load data
  tm.loadJSON(json['all']);
  tm.refresh();
  //end
}

