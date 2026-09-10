const { build } = await import(process.env.JW_AUDIT_VITE_ENTRY || 'vite');
import { writeFile, readdir, readFile } from 'node:fs/promises';
import { gzipSync, brotliCompressSync } from 'node:zlib';
const entries = {
 'embla-react': `export {default as useEmblaCarousel} from 'embla-carousel-react';`,
 'embla-autoplay': `export {default as useEmblaCarousel} from 'embla-carousel-react'; export {default as Autoplay} from 'embla-carousel-autoplay';`,
 'embla-autoplay-fade': `export {default as useEmblaCarousel} from 'embla-carousel-react'; export {default as Autoplay} from 'embla-carousel-autoplay'; export {default as Fade} from 'embla-carousel-fade';`,
 'swiper-react': `export {Swiper,SwiperSlide} from 'swiper/react'; import 'swiper/css';`,
 'swiper-common': `export {Swiper,SwiperSlide} from 'swiper/react'; export {Navigation,Pagination,A11y,Autoplay} from 'swiper/modules'; import 'swiper/css'; import 'swiper/css/navigation'; import 'swiper/css/pagination'; import 'swiper/css/a11y'; import 'swiper/css/autoplay';`,
 'swiper-common-fade': `export {Swiper,SwiperSlide} from 'swiper/react'; export {Navigation,Pagination,A11y,Autoplay,EffectFade} from 'swiper/modules'; import 'swiper/css'; import 'swiper/css/navigation'; import 'swiper/css/pagination'; import 'swiper/css/a11y'; import 'swiper/css/autoplay'; import 'swiper/css/effect-fade';`
};
const results=[];
for (const [name, source] of Object.entries(entries)) {
 await writeFile(name+'.js',source);
 const built=await build({configFile:false,logLevel:'error',define:{'process.env.NODE_ENV':JSON.stringify('production')},build:{write:false,minify:'esbuild',target:'es2020',sourcemap:false,lib:{entry:name+'.js',name:'CarouselAudit',cssFileName:'carousel',formats:['iife']},rollupOptions:{external:['react','react-dom','react/jsx-runtime'],output:{globals:{react:'React','react-dom':'ReactDOM','react/jsx-runtime':'ReactJSXRuntime'}}}}});
 const files=[];
 for(const bundle of (Array.isArray(built)?built:[built]))for(const out of bundle.output){const content=out.type==='chunk'?out.code:out.source;const b=Buffer.from(content);files.push({name:out.fileName,bytes:b.length,gzip:gzipSync(b,{level:9}).length,brotli:brotliCompressSync(b).length});}
 results.push({name,files,total:files.reduce((a,x)=>({bytes:a.bytes+x.bytes,gzip:a.gzip+x.gzip,brotli:a.brotli+x.brotli}),{bytes:0,gzip:0,brotli:0})});
}
const pkg={version:'7.3.6'}; // Version used in this recorded experiment; use Vite 7.3.6 to reproduce.
await writeFile('results.json',JSON.stringify({node:process.version,vite:pkg.version,minifier:'esbuild',target:'es2020',format:'iife',react:'external',gzipLevel:9,results},null,2));
console.log(await readFile('results.json','utf8'));
