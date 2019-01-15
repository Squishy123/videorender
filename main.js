//gpu acceleration
const gpu = new GPU();

async function extractFrames(videoElement, canvasPipe) {
    let extracted = [];
    let duration = 0;

    //increase playback rate to 3 times the rate
    videoElement.playbackRate = 1.5;

    try {
        //play video
        //await videoElement.play();

        //capture frames
        await new Promise((res, rej) => {
            videoElement.addEventListener('play', function () {
                function capture() {
                    if (videoElement.ended) return res();

                    let captured = captureFrame(videoElement, canvasPipe);
                    extracted.push(captured);

                    //videoElement.play();

                    duration = videoElement.duration;

                    //only grab frames 30fps and lower
                    setTimeout(capture, 1000 / 60);
                }

                capture();
            });
        });
    } catch (err) {
        //console.log(err);
    }
    return {
        frames: extracted,
        fps: extracted.length / duration,
        duration: duration
    };
}

function captureFrame(videoElement, canvasPipe) {
    //pause playback
    //videoElement.pause();

    //pipe video data to canvas
    canvasPipe.drawImage(videoElement, 0, 0, videoElement.width, videoElement.height);
    let capture = canvasPipe.getImageData(0, 0, videoElement.width, videoElement.height);

    return capture;
}

function increaseFrame(frames, videoElement, factor) {
    let double = [];
    for (let i = 1; i < frames.length; i += 1) {
        let opticalFlowFrame = [];
        opticalFlowFrame.push(frames[i - 1].data);
        for (let f = 1; f <= factor-1; f++) {
            let smoothFrame = [];
            frames[i].data.forEach((p1, pixelIndex) => {
                    let dist = Math.abs(frames[i - 1].data[pixelIndex] - p1);

                    //linear
                    //smoothFrame.push((f / factor-1 * dist) + frames[i - 1].data[pixelIndex]);

                    //sin
                    smoothFrame.push((0.5*Math.sin(f / factor-1 * 0.25) * dist) + 0.5 + frames[i - 1].data[pixelIndex]);
            });
            opticalFlowFrame.push(smoothFrame);
        }
        //opticalFlowFrame.push(frames[i].data);
        opticalFlowFrame.forEach((frame) => {
            double.push(new ImageData(new Uint8ClampedArray(frame), videoElement.width, videoElement.height))
        });
    }
    return {
        frames: double
    };
}

const buildOpticFlowFrame = function (frame1, frame2, factor) {
    /*let oFF = [1];
    //for(let pixelIndex = 0; pixelIndex < frame1.length; pixelIndex++) {
        oFF.push(frame1[pixelIndex]);
       for (let f = 1; f <= factor-1; f++) { 
            oFF.push((0.5*Math.sin(f / factor-1 * 0.25) * Math.abs(frame1[this.thread.x], frame2[this.thread.x]) + 0.5 + frame1[this.thread.x]));        
        }
   // }
    return oFF;*/
    return Math.abs(frame1[this.thread.y] - frame2[this.thread.y])
}

const increaseFrameGPU = function () {
    let increased = [];
    for (let i = 1; i < this.constant.frames.length; i += 1) {
        let opticalFlowFrame = [];
        //opticalFlowFrame.push(this.constant.frames[i - 1].data);
        for (let f = 1; f <= factor-1; f++) {
            let smoothFrame = [];
            for(let pixelIndex = 0; pixelIndex < this.constant.frames[i].data.length; pixelIndex++) {
                    let dist = Math.abs(this.constant.frames[i - 1].data[pixelIndex] - this.constant.frames[i].data[pixelIndex]);
                    console.log(pixelIndex);
                    //linear
                    //smoothFrame.push((f / factor-1 * dist) + frames[i - 1].data[pixelIndex]);

                    //sin
                    smoothFrame.push((0.5*Math.sin(f / factor-1 * 0.25) * dist) + 0.5 + this.constant.frames[i - 1].data[pixelIndex]);
            }
            opticalFlowFrame.push(smoothFrame);
        }
        //opticalFlowFrame.push(frames[i].data);
        for(let off = 0; off < opticalFlowFrame.length; off++) {
            increased.push(new ImageData(new Uint8ClampedArray(opticalFlowFrame[off]), videoElement.width, videoElement.height))
        }
    }
    return increased;  
}

async function playRender(canvasElement, frames, fps) {
    function playFrame(frames, index) {
        if (index >= frames.length) return setTimeout(function () {
            playFrame(frames, 0)
        }, 1000 / fps);

        canvasElement.putImageData(frames[index], 0, 0);

        setTimeout(function () {
            playFrame(frames, index + 1)
        }, 1000 / fps);
    }

    playFrame(frames, 0);
}

document.addEventListener('DOMContentLoaded', async () => {
    let videoElement = document.querySelector('#source');
    let pipeElement = document.querySelector('#pipe').getContext('2d');
    let extractElement = document.querySelector('#extract').getContext('2d');
    let renderElement = document.querySelector('#render').getContext('2d');
    [document.querySelector('#render').width, document.querySelector('#render').height] = [videoElement.width, videoElement.height];

    let extracted = await extractFrames(videoElement, pipeElement)
    // .then(function (extracted) {
    //print benchmarks
    document.querySelector('#src-benchmarks').innerHTML = `Extracted FPS: ${extracted.fps}, Number of Frames: ${extracted.frames.length}, Duration: ${extracted.duration} s`;
    document.querySelector('#extract-benchmarks').innerHTML = `Extracted FPS: ${extracted.fps}, Number of Frames: ${extracted.frames.length}, Duration: ${extracted.duration} s`;
    console.log(`Extracted FPS: ${extracted.fps}, Number of Frames: ${extracted.frames.length}, Duration: ${extracted.duration} s`);
    // });


    console.log(extracted.frames[0]);
    let genRender = (new GPU({mode: "gpu"}))
    .createKernel(buildOpticFlowFrame)
    .setOutput([extracted.frames.length * 2]);

    let fill = new Array(extracted.frames[0].data.length);

    let test = genRender(extracted.frames[0].data, extracted.frames[1].data, 2);
    console.log(test);
    //   .then(function (doubleFPS) {
    //print benchmarks
    //document.querySelector('#render-benchmarks').innerHTML = `Render FPS: ${doubleFPS.frames.length/extracted.duration}, Number of Frames: ${doubleFPS.frames.length}`;
    //console.log(`Render FPS: ${doubleFPS.frames.length/extracted.duration}, Number of Frames: ${doubleFPS.frames.length}`);

    //   });

    //play render and original side by side
    /*await Promise.all([async function () {
        videoElement.playbackRate = 1;
        await videoElement.play()
    }, playRender(renderElement, doubleFPS.frames, (doubleFPS.frames.length / extracted.duration)), playRender(extractElement, extracted.frames, extracted.fps)]);
    */
});