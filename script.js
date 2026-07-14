(function(){
  "use strict";
  var SIZE = 32;
  var view = document.getElementById('view');
  var vctx = view.getContext('2d');
  var buffer = document.getElementById('buffer');
  var bctx = buffer.getContext('2d');
  var wrap = document.getElementById('canvasWrap');

  var scale = 16;
  var tool = 'pencil';
  var primaryColor = '#101014';
  var shapeFilled = false;
  var gridOn = true;

  var drawing = false;
  var startX = 0, startY = 0;
  var undoStack = [], redoStack = [];
  var MAX_HISTORY = 60;

  var PALETTE = [
    '#101014','#f5f1e6','#8a8578','#4a4438',
    '#8a1f2b','#c24b5c','#d8b34a','#9c7420',
    '#1f3a63','#3f6fb0','#2f5233','#5f9a5a',
    '#5b2a6e','#8f5aa8','#4a3728','#c98a4b',
    '#1c1c26','#e8dfc8','#7d2130','#2a4f7a'
  ];

  function applyScale(){
    view.width = SIZE * scale;
    view.height = SIZE * scale;
    wrap.style.setProperty('--s', scale + 'px');
    wrap.style.backgroundSize = (scale*2) + 'px ' + (scale*2) + 'px';
    document.getElementById('zoomValue').textContent = scale + 'px';
    render();
  }

  function hexToRgb(hex){
    var m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return m ? { r: parseInt(m[1],16), g: parseInt(m[2],16), b: parseInt(m[3],16) } : { r:0,g:0,b:0 };
  }

  function snapshot(){
    return bctx.getImageData(0,0,SIZE,SIZE);
  }
  function pushUndo(){
    undoStack.push(snapshot());
    if (undoStack.length > MAX_HISTORY) undoStack.shift();
    redoStack.length = 0;
    updateHistoryButtons();
  }
  function updateHistoryButtons(){
    document.getElementById('undoBtn').disabled = undoStack.length === 0;
    document.getElementById('redoBtn').disabled = redoStack.length === 0;
  }
  function undo(){
    if (!undoStack.length) return;
    redoStack.push(snapshot());
    bctx.putImageData(undoStack.pop(), 0, 0);
    updateHistoryButtons();
    render();
  }
  function redo(){
    if (!redoStack.length) return;
    undoStack.push(snapshot());
    bctx.putImageData(redoStack.pop(), 0, 0);
    updateHistoryButtons();
    render();
  }

  function paintPixel(x,y,erase){
    if (x<0||y<0||x>=SIZE||y>=SIZE) return;
    if (erase){
      bctx.clearRect(x,y,1,1);
    } else {
      bctx.fillStyle = primaryColor;
      bctx.fillRect(x,y,1,1);
    }
  }

  function floodFill(x,y){
    if (x<0||y<0||x>=SIZE||y>=SIZE) return;
    var img = bctx.getImageData(0,0,SIZE,SIZE);
    var data = img.data;
    function idx(px,py){ return (py*SIZE+px)*4; }
    var start = idx(x,y);
    var tr = data[start], tg = data[start+1], tb = data[start+2], ta = data[start+3];
    var rgb = hexToRgb(primaryColor);
    var rr=rgb.r, rg=rgb.g, rb=rgb.b, ra=255;
    if (tr===rr && tg===rg && tb===rb && ta===ra) return;
    var stack = [[x,y]];
    var visited = new Uint8Array(SIZE*SIZE);
    while (stack.length){
      var p = stack.pop();
      var px=p[0], py=p[1];
      if (px<0||py<0||px>=SIZE||py>=SIZE) continue;
      var vi = py*SIZE+px;
      if (visited[vi]) continue;
      var i = idx(px,py);
      if (data[i]!==tr || data[i+1]!==tg || data[i+2]!==tb || data[i+3]!==ta) continue;
      visited[vi]=1;
      data[i]=rr; data[i+1]=rg; data[i+2]=rb; data[i+3]=ra;
      stack.push([px+1,py]); stack.push([px-1,py]); stack.push([px,py+1]); stack.push([px,py-1]);
    }
    bctx.putImageData(img,0,0);
  }

  function linePixels(x0,y0,x1,y1){
    var pts = [];
    var dx = Math.abs(x1-x0), sx = x0<x1?1:-1;
    var dy = -Math.abs(y1-y0), sy = y0<y1?1:-1;
    var err = dx+dy;
    while(true){
      pts.push([x0,y0]);
      if (x0===x1 && y0===y1) break;
      var e2 = 2*err;
      if (e2>=dy){ err+=dy; x0+=sx; }
      if (e2<=dx){ err+=dx; y0+=sy; }
    }
    return pts;
  }

  function rectPixels(x0,y0,x1,y1,filled){
    var minX=Math.min(x0,x1), maxX=Math.max(x0,x1);
    var minY=Math.min(y0,y1), maxY=Math.max(y0,y1);
    var pts = [];
    for (var y=minY;y<=maxY;y++){
      for (var x=minX;x<=maxX;x++){
        if (filled || x===minX||x===maxX||y===minY||y===maxY) pts.push([x,y]);
      }
    }
    return pts;
  }

  function circlePixels(x0,y0,x1,y1,filled){
    var minX=Math.min(x0,x1), maxX=Math.max(x0,x1);
    var minY=Math.min(y0,y1), maxY=Math.max(y0,y1);
    var cx=(minX+maxX)/2, cy=(minY+maxY)/2;
    var rx=Math.max((maxX-minX)/2,0.5), ry=Math.max((maxY-minY)/2,0.5);
    var ring = Math.max(1/rx, 1/ry) * 1.4;
    var pts = [];
    for (var y=minY;y<=maxY;y++){
      for (var x=minX;x<=maxX;x++){
        var nx=(x+0.5-cx-0.5)/rx, ny=(y+0.5-cy-0.5)/ry;
        var d = nx*nx+ny*ny;
        if (filled){ if (d<=1) pts.push([x,y]); }
        else { if (d<=1 && d> (1-ring)*(1-ring)) pts.push([x,y]); }
      }
    }
    return pts;
  }

  function drawGrid(){
    vctx.strokeStyle = 'rgba(128,120,100,.35)';
    vctx.lineWidth = 1;
    for (var i=0;i<=SIZE;i++){
      var p = i*scale + 0.5;
      var major = (i % 8 === 0);
      vctx.globalAlpha = major ? 0.9 : 0.35;
      vctx.beginPath();
      vctx.moveTo(p,0); vctx.lineTo(p,SIZE*scale);
      vctx.stroke();
      vctx.beginPath();
      vctx.moveTo(0,p); vctx.lineTo(SIZE*scale,p);
      vctx.stroke();
    }
    vctx.globalAlpha = 1;
  }

  function render(previewPts){
    vctx.imageSmoothingEnabled = false;
    vctx.clearRect(0,0,view.width,view.height);
    vctx.drawImage(buffer,0,0,SIZE,SIZE,0,0,view.width,view.height);
    if (previewPts && previewPts.length){
      vctx.fillStyle = primaryColor;
      for (var k=0;k<previewPts.length;k++){
        var px=previewPts[k][0], py=previewPts[k][1];
        vctx.fillRect(px*scale, py*scale, scale, scale);
      }
    }
    if (gridOn) drawGrid();
  }

  function coordsFromEvent(evt){
    var rect = view.getBoundingClientRect();
    var x = Math.floor((evt.clientX - rect.left) / (rect.width / SIZE));
    var y = Math.floor((evt.clientY - rect.top) / (rect.height / SIZE));
    return [Math.max(0,Math.min(SIZE-1,x)), Math.max(0,Math.min(SIZE-1,y))];
  }

  function setActiveColor(hex){
    primaryColor = hex;
    document.getElementById('activeSwatch').style.background = hex;
    document.getElementById('hexInput').value = hex;
    document.getElementById('nativeColor').value = hex;
    var pressed = document.querySelectorAll('.swatch[aria-pressed="true"]');
    pressed.forEach(function(s){ s.setAttribute('aria-pressed','false'); });
    var match = document.querySelector('.swatch[data-color="'+hex+'"]');
    if (match) match.setAttribute('aria-pressed','true');
  }

  function setTool(next){
    tool = next;
    document.querySelectorAll('.tool').forEach(function(btn){
      btn.setAttribute('aria-pressed', btn.getAttribute('data-tool')===next ? 'true':'false');
    });
    var shapeTool = (next==='rect' || next==='circle');
    document.getElementById('shapeFill').parentElement.style.opacity = shapeTool ? '1':'.5';
  }

  var swWrap = document.getElementById('swatches');
  PALETTE.forEach(function(hex){
    var b = document.createElement('button');
    b.className = 'swatch';
    b.style.background = hex;
    b.setAttribute('data-color', hex);
    b.setAttribute('aria-pressed','false');
    b.title = hex;
    b.addEventListener('click', function(){ setActiveColor(hex); });
    swWrap.appendChild(b);
  });

  document.querySelectorAll('.tool').forEach(function(btn){
    btn.addEventListener('click', function(){ setTool(btn.getAttribute('data-tool')); });
  });

  document.getElementById('shapeFill').addEventListener('change', function(e){
    shapeFilled = e.target.checked;
  });
  document.getElementById('gridToggle').addEventListener('change', function(e){
    gridOn = e.target.checked;
    render();
  });

  document.getElementById('hexInput').addEventListener('change', function(e){
    var v = e.target.value.trim();
    if (!/^#?[0-9a-fA-F]{6}$/.test(v)) { e.target.value = primaryColor; return; }
    if (v[0] !== '#') v = '#' + v;
    setActiveColor(v.toLowerCase());
  });
  document.getElementById('nativeColor').addEventListener('input', function(e){
    setActiveColor(e.target.value);
  });

  var modalOverlay = document.getElementById('modalOverlay');
  var modalBox = document.getElementById('modalBox');

  function hideModal(){
    modalOverlay.hidden = true;
    modalBox.innerHTML = '';
  }
  function showModal(){
    modalOverlay.hidden = false;
  }
  modalOverlay.addEventListener('click', function(e){
    if (e.target === modalOverlay) hideModal();
  });
  window.addEventListener('keydown', function(e){
    if (e.key === 'Escape' && !modalOverlay.hidden) hideModal();
  });

  function confirmDialog(message, onConfirm){
    modalBox.innerHTML = '';
    var p = document.createElement('p');
    p.className = 'modal-text';
    p.textContent = message;
    var actions = document.createElement('div');
    actions.className = 'modal-actions';
    var cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'btn';
    cancelBtn.textContent = 'Скасувати';
    cancelBtn.addEventListener('click', hideModal);
    var okBtn = document.createElement('button');
    okBtn.type = 'button';
    okBtn.className = 'btn btn-danger';
    okBtn.textContent = 'Так, очистити';
    okBtn.addEventListener('click', function(){ hideModal(); onConfirm(); });
    actions.appendChild(cancelBtn);
    actions.appendChild(okBtn);
    modalBox.appendChild(p);
    modalBox.appendChild(actions);
    showModal();
  }

  function showDownloadModal(dataUrl){
    modalBox.innerHTML = '';
    var title = document.createElement('p');
    title.className = 'modal-text';
    title.textContent = 'Готово! Збережіть зображення:';
    var img = document.createElement('img');
    img.className = 'modal-preview';
    img.src = dataUrl;
    img.alt = 'crest-32x32';
    var hint = document.createElement('p');
    hint.className = 'hint';
    hint.textContent = 'Клацніть правою кнопкою на зображенні і виберіть «Зберегти зображення як…», або натисніть кнопку нижче.';
    var actions = document.createElement('div');
    actions.className = 'modal-actions';
    var closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'btn';
    closeBtn.textContent = 'Закрити';
    closeBtn.addEventListener('click', hideModal);
    var link = document.createElement('a');
    link.className = 'btn-primary';
    link.href = dataUrl;
    link.download = 'crest-32x32.png';
    link.textContent = 'Завантажити файл';
    actions.appendChild(closeBtn);
    actions.appendChild(link);
    modalBox.appendChild(title);
    modalBox.appendChild(img);
    modalBox.appendChild(hint);
    modalBox.appendChild(actions);
    showModal();
  }

  document.getElementById('undoBtn').addEventListener('click', undo);
  document.getElementById('redoBtn').addEventListener('click', redo);
  document.getElementById('clearBtn').addEventListener('click', function(){
    confirmDialog('Очистити все полотно?', function(){
      pushUndo();
      bctx.clearRect(0,0,SIZE,SIZE);
      render();
    });
  });

  document.getElementById('zoomIn').addEventListener('click', function(){
    scale = Math.min(32, scale + 4);
    applyScale();
  });
  document.getElementById('zoomOut').addEventListener('click', function(){
    scale = Math.max(6, scale - 4);
    applyScale();
  });

  document.getElementById('downloadBtn').addEventListener('click', function(){
    showDownloadModal(buffer.toDataURL('image/png'));
  });

  view.addEventListener('pointerdown', function(evt){
    view.setPointerCapture(evt.pointerId);
    var c = coordsFromEvent(evt);
    startX = c[0]; startY = c[1];
    drawing = true;

    if (tool === 'dropper'){
      var d = bctx.getImageData(c[0],c[1],1,1).data;
      if (d[3] > 0){
        var hex = '#' + [d[0],d[1],d[2]].map(function(v){ return v.toString(16).padStart(2,'0'); }).join('');
        setActiveColor(hex);
      }
      drawing = false;
      return;
    }

    pushUndo();

    if (tool === 'pencil'){ paintPixel(c[0],c[1],false); render(); }
    else if (tool === 'eraser'){ paintPixel(c[0],c[1],true); render(); }
    else if (tool === 'fill'){ floodFill(c[0],c[1]); render(); drawing=false; }
    else { render(); }
  });

  view.addEventListener('pointermove', function(evt){
    var c = coordsFromEvent(evt);
    document.getElementById('ox').textContent = c[0];
    document.getElementById('oy').textContent = c[1];
    var d = bctx.getImageData(c[0],c[1],1,1).data;
    document.getElementById('ohex').textContent = d[3]>0
      ? '#' + [d[0],d[1],d[2]].map(function(v){ return v.toString(16).padStart(2,'0'); }).join('')
      : '—';

    if (!drawing) return;

    if (tool === 'pencil'){ paintPixel(c[0],c[1],false); render(); }
    else if (tool === 'eraser'){ paintPixel(c[0],c[1],true); render(); }
    else if (tool === 'line'){ render(linePixels(startX,startY,c[0],c[1])); }
    else if (tool === 'rect'){ render(rectPixels(startX,startY,c[0],c[1],shapeFilled)); }
    else if (tool === 'circle'){ render(circlePixels(startX,startY,c[0],c[1],shapeFilled)); }
  });

  function finishStroke(evt){
    if (!drawing) return;
    drawing = false;
    var c = coordsFromEvent(evt);
    var pts = null;
    if (tool === 'line') pts = linePixels(startX,startY,c[0],c[1]);
    else if (tool === 'rect') pts = rectPixels(startX,startY,c[0],c[1],shapeFilled);
    else if (tool === 'circle') pts = circlePixels(startX,startY,c[0],c[1],shapeFilled);
    if (pts){
      bctx.fillStyle = primaryColor;
      pts.forEach(function(p){ bctx.fillRect(p[0],p[1],1,1); });
    }
    render();
  }
  view.addEventListener('pointerup', finishStroke);
  view.addEventListener('pointercancel', finishStroke);
  view.addEventListener('pointerleave', function(){
    document.getElementById('ox').textContent = '–';
    document.getElementById('oy').textContent = '–';
    document.getElementById('ohex').textContent = '–';
  });

  window.addEventListener('keydown', function(e){
    var tag = (e.target && e.target.tagName) || '';
    if (tag === 'INPUT') return;
    var k = e.key.toLowerCase();
    if (e.ctrlKey || e.metaKey){
      if (k==='z'){ e.preventDefault(); if (e.shiftKey) redo(); else undo(); }
      else if (k==='y'){ e.preventDefault(); redo(); }
      return;
    }
    var map = { p:'pencil', e:'eraser', f:'fill', i:'dropper', l:'line', r:'rect', c:'circle' };
    if (map[k]) setTool(map[k]);
    else if (k==='g'){ var gt=document.getElementById('gridToggle'); gt.checked=!gt.checked; gridOn=gt.checked; render(); }
  });

  bctx.imageSmoothingEnabled = false;
  setActiveColor(primaryColor);
  applyScale();
  updateHistoryButtons();
})();
