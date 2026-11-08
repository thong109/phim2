// Deterministic capture for this project's Canvas-only scenes.
// Reads the same authored scene/GSAP HTML as HyperFrames; encodes sequentially.
const fs=require('fs');
const path=require('path');
const {pathToFileURL}=require('url');
const {spawn}=require('child_process');
const {once}=require('events');
(async()=>{
  const [folder,output,fpsArg]=process.argv.slice(2),fps=Number(fpsArg||24);
  const workspace=process.env.STORY_WORKSPACE||'D:/01-project/video';
  const {default:puppeteer}=await import(pathToFileURL(path.join(workspace,'node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js')).href);
  const browser=await puppeteer.launch({executablePath:process.env.HYPERFRAMES_BROWSER_PATH,headless:true,args:['--no-sandbox','--allow-file-access-from-files'],userDataDir:path.join(process.env.TEMP,'canvas-browser')});
  let encoder;
  try{
    const page=await browser.newPage();await page.setViewport({width:1280,height:720,deviceScaleFactor:1});
    await page.evaluateOnNewDocument(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(kind,options){return original.call(this,kind,kind==='2d'?{...options,willReadFrequently:true}:options);};});
    const errors=[];page.on('pageerror',e=>errors.push(String(e)));
    await page.goto(pathToFileURL(path.join(folder,'index.html')).href);
    await page.waitForFunction(()=>window.STORY_READY===true);
    const info=await page.evaluate(()=>({duration:window.STORY_SHOT.duration,assetError:document.body.dataset.assetError}));
    if(info.assetError)throw Error('Missing background: '+info.assetError);
    const total=Math.min(Math.round(info.duration*fps),Number(process.env.STORY_FRAME_LIMIT)||Infinity);
    encoder=spawn(process.env.HYPERFRAMES_FFMPEG_PATH,['-nostdin','-hide_banner','-loglevel','error','-y','-f','image2pipe','-vcodec','mjpeg','-r',String(fps),'-i','pipe:0','-an','-c:v','libx264','-preset','veryfast','-crf','20','-pix_fmt','yuv420p','-movflags','+faststart',output],{windowsHide:true,stdio:['pipe','ignore','pipe']});
    let stderr='';encoder.stderr.on('data',d=>stderr=(stderr+d.toString()).slice(-8000));
    const finished=new Promise((resolve,reject)=>{encoder.on('error',reject);encoder.on('close',code=>code===0?resolve():reject(Error('FFmpeg '+code+': '+stderr)));});
    encoder.stdin.on('error',()=>{});
    const start=Date.now();
    for(let frame=0;frame<total;frame+=8){
      const batch=await page.evaluate(({frame,total,fps})=>{const out=[];for(let f=frame;f<Math.min(frame+8,total);f++){window.drawStoryFrame(f/fps);out.push(document.querySelector('canvas').toDataURL('image/jpeg',.94).split(',')[1]);}return out;},{frame,total,fps});
      for(const data of batch)if(!encoder.stdin.write(Buffer.from(data,'base64')))await once(encoder.stdin,'drain');
      if(frame%240===0)console.log(`Canvas ${frame}/${total}; ${((Date.now()-start)/1000).toFixed(1)}s elapsed`);
      if(errors.length)throw Error(errors.join('\n'));
    }
    encoder.stdin.end();await finished;
    console.log(`Canvas complete: ${total} frames in ${((Date.now()-start)/1000).toFixed(1)}s`);
  }finally{if(encoder&&encoder.exitCode===null)encoder.kill();await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
