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
            videoElement.addEventListener('play', function() {
                function capture() {
                    if (videoElement.ended) return res();

                    let captured = captureFrame(videoElement, canvasPipe);
                    extracted.push(captured);

                    //videoElement.play();

                    duration = videoElement.duration;

                    setTimeout(capture, 1000/60);
                }

                capture();
            });
        });
    } catch (err) {
        //console.log(err);
    }
    return {frames: extracted, fps: extracted.length/duration, duration: duration};
}

function captureFrame(videoElement, canvasPipe) {
    //pause playback
    //videoElement.pause();

    //pipe video data to canvas
    canvasPipe.drawImage(videoElement, 0, 0, videoElement.width, videoElement.height);
    let capture = canvasPipe.getImageData(0, 0, videoElement.width, videoElement.height);

    return capture;
}

function doubleFrame(frames, videoElement) {
    let double = [];
    for(let i = 1; i < frames.length; i+=2) {
        let opticalFlowFrame = [];
        opticalFlowFrame.push(frames[i-1].data);
        let smoothFrame = [];
        frames[i].data.forEach((p1, pixelIndex )=> {
            smoothFrame.push((frames[i-1].data[pixelIndex] + p1)/2);
        });
        opticalFlowFrame.push(smoothFrame);
        opticalFlowFrame.push(frames[i].data);
        opticalFlowFrame.map((frame) => {
            double.push(new ImageData(new Uint8ClampedArray(frame), videoElement.width, videoElement.height))
        });
    }
    return {frames: double};
}

function playRender(canvasElement, frames, fps) {
    function playFrame(frames, index) {
        if(index >= frames.length) return setTimeout(function() {playFrame(frames, 0)}, 1000/fps) ;

        canvasElement.putImageData(frames[index], 0, 0);

        setTimeout(function() {playFrame(frames, index+1)}, 1000/fps);
    }

    playFrame(frames, 0);
}

document.addEventListener('DOMContentLoaded', async () => {
    let videoElement = document.querySelector('#source');
    let pipeElement = document.querySelector('#pipe').getContext('2d');
    let renderElement = document.querySelector('#render').getContext('2d');
    [ document.querySelector('#render').width,  document.querySelector('#render').height] = [videoElement.width, videoElement.height];

    let extracted = await extractFrames(videoElement, pipeElement);
    console.log(`Extracted FPS: ${extracted.fps}, Number of Frames: ${extracted.frames.length}, Duration: ${extracted.duration} s`);
    let doubleFPS = doubleFrame(extracted.frames, videoElement);
    console.log(`Render FPS: ${doubleFPS.frames.length/extracted.duration}, Number of Frames: ${doubleFPS.frames.length}`);

    playRender(renderElement, doubleFPS.frames, doubleFPS.frames.length/extracted.duration);

});