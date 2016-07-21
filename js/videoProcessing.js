function VideoEditor() {
    this.shiftSize = 2;
    this.width = 500;
    this.height = 720 / 1280 * this.width;
}

VideoEditor.prototype.timerCallback = function() {
    if (this.videoScratches.paused || this.videoScratches.ended || this.video.ended) {
        if (this.video.ended) {
            this.videoScratches.pause();
            window.setTimeout(this.audio.pause.bind(this.audio), 2000);
        }

        return;
    }

    this.draw.call(this);
    setTimeout(this.timerCallback.bind(this), 0);
}

VideoEditor.prototype.loadElements = function() {
    var speed = 1;
    this.video = document.getElementById("video");
    this.video.addEventListener("play", this.timerCallback.bind(this));
    this.video.volume = 0;
    this.video.playbackRate = speed;

    var shift = Math.floor(this.shiftSize);
    this.canvasVisible = document.getElementById('canvas');
    this.canvasVisible.width = this.width - shift;
    this.canvasVisible.height = this.height - shift;
    this.ctxVisible = this.canvasVisible.getContext('2d');

    this.videoScratches = document.createElement('video');
    this.videoScratches.src = "img/effect.mp4";
    this.videoScratches.playbackRate = 0.6 * speed;
    this.videoScratches.volume = 1;

    this.canvasHidden = document.createElement('canvas');
    this.canvasHidden.width = this.width;
    this.canvasHidden.height = this.height;
    this.ctxHidden = this.canvasHidden.getContext('2d');

    this.canvasScratches = document.createElement('canvas');
    this.canvasScratches.width = this.width;
    this.canvasScratches.height = this.height;
    this.ctxScratches = this.canvasScratches.getContext('2d');

    this.audio = document.createElement('audio');
    this.audio.src = 'Maple_Leaf_RagQ.ogg';
    this.audio.volume = 0.2;
    this.audio.playbackRate = speed;

    this.video.addEventListener("loadedmetadata", this.loadSubs.bind(this));
    this.video.addEventListener("loadeddata", this.loadSubs.bind(this));
}

VideoEditor.prototype.loadSubs = function() {
    this.subsManager = new SubsManager(this.video.textTracks[0]);
    this.subsManager.setStartTime.call(this);
}

VideoEditor.prototype.play = function() {
    this.video.play();
    this.videoScratches.play();
    this.audio.play();
}

VideoEditor.prototype.stop = function() {
    this.video.pause();
    this.videoScratches.pause();
    this.audio.pause();
}

VideoEditor.prototype.makeScratchesNoise = function(length, min, max) {
    var noiseData = [];
    for (var i = 0; i < length; i++) {
        noiseData[i] = Math.random() * (max - min) + min;

        if (Math.random() > 0.9996)
            noiseData[i] = 1.3;
    }
    return noiseData;
}

VideoEditor.prototype.getData = function() {
    this.ctxHidden.drawImage(this.video,
                                0, 0, this.video.videoWidth, this.video.videoHeight,
                                0, 0, this.width, this.height);
    var imageData = this.ctxHidden.getImageData(0, 0, this.width, this.height);
    this.grayscale.call(this, imageData);

    this.ctxScratches.drawImage(this.videoScratches,
                                0, 0, this.videoScratches.videoWidth, this.videoScratches.videoHeight,
                                0, 0, this.width, this.height);
    var scratchesImageData = this.ctxScratches.getImageData(0, 0, this.width, this.height);
    this.updateScratches.call(this, scratchesImageData);

    return {background: imageData, scratches: scratchesImageData};
}

VideoEditor.prototype.grayscale = function(imageData) {
    var data = imageData.data;

    var colorTop = 350 + Math.random() * 30;
    var colorBottom = 20 + Math.random() * 15;
    var scale = (colorTop - colorBottom) / 255;

    var scratchesNoise = this.makeScratchesNoise(this.width, 0.97, 1);

    for (var i = 0; i < data.length; i += 4) {
        var avg = 0.21 * data[i] + 0.72 * data[i + 1] + 0.07 * data[i + 2];
        avg *= scratchesNoise[Math.floor((i/4) % this.width)]; // scratches
        avg = scale * avg + colorBottom; // flickering

        data[i]     = avg; // red
        data[i + 1] = avg; // green
        data[i + 2] = avg; // blue
    }
    return imageData;
}


VideoEditor.prototype.updateScratches = function(imageData) {
    var data = imageData.data;
    var top = 500;
    var bottom = -20;
    var scale = (top - bottom) / 255;
    for (var i = 0; i < data.length; i += 4) {
        var res = data[i] * scale + bottom;
        data[i] = data[i + 1] = data[i + 2] = 255 - res;
    }

    return imageData;
};

VideoEditor.prototype.draw = function() {
    var data = this.getData.call(this);

    var shiftX = -Math.floor(Math.random() * this.shiftSize);
    var shiftY = -Math.floor(Math.random() * this.shiftSize);

    this.ctxHidden.clearRect(0, 0, this.width, this.height);
    this.ctxScratches.clearRect(0, 0, this.width, this.height);
    this.ctxVisible.clearRect(0, 0, this.width, this.height);

    var subs = this.subsManager == undefined ? '' : this.subsManager.getSub();
    if (subs == '' && !this.video.ended) {
        this.video.play();
        this.ctxHidden.putImageData(data.background, shiftX, shiftY);
    }
    else {
        this.video.pause();
        this.ctxHidden.fillStyle = "#060606";
        this.ctxHidden.fillRect(0, 0, this.width, this.height);

        var imageData = this.ctxHidden.getImageData(0, 0, this.width, this.height);
        this.ctxHidden.putImageData(this.grayscale.call(this, imageData), 0, 0);

        var size = ((subs[0] != undefined && subs[0].length > 36) ||
                    (subs[1] != undefined && subs[1].length > 36)) ? '16px' : '25px';

        this.ctxHidden.font = size + " Neucha";
        this.ctxHidden.fillStyle = "white";
        this.ctxHidden.textAlign = "center";

        for (var i = 0; i < subs.length; i++) {
            this.ctxHidden.fillText(subs[i], this.width / 2 + shiftX, this.height / 2 + 30 * (i - 0.2) + shiftY);
        }
    }

    this.ctxScratches.putImageData(data.scratches, 0, 0);
    this.ctxVisible.globalCompositeOperation = "lighter";
    this.ctxVisible.drawImage(this.canvasHidden, 0, 0, this.width, this.height);
    this.ctxVisible.drawImage(this.canvasScratches, 0, 0, this.width, this.height);
}

function SubsManager(subs) {
    console.log('loadsub');
    this.subs = subs;
    this.sub = "";
}

SubsManager.prototype.setStartTime = function() {
    this.startTime = (new Date()).getTime();
}

SubsManager.prototype.getSub = function() {
    if (this.subs.activeCues.length != 0) {
        if (this.curSub == undefined || this.subs.activeCues[0].startTime != this.curSub.startTime) {
            this.curSub = this.subs.activeCues[0];

            var sub = "";
            for (var i = 0; i < this.subs.activeCues.length; i++)
                sub += this.subs.activeCues[i].text;

            if (sub != "") {
                sub = sub.split('\n');
            }
            this.sub = sub;

            this.startTime = (new Date()).getTime();
        }
    }

    var delay = 4500;
    var show = 2000;
    var t = (new Date()).getTime();
    if (t - this.startTime >= delay && t - this.startTime <= delay + show)
        return this.sub;
    else
        return "";
}

var videoEditor;
function load() {
    videoEditor = new VideoEditor();
    videoEditor.loadElements();
}

function play() {
    if (videoEditor != undefined)
        videoEditor.play();
}

function stop() {
    if (videoEditor != undefined)
        videoEditor.stop();
}