const fs=require('node:fs'),path=require('node:path'),esbuild=require('esbuild');
const root=path.resolve(__dirname,'..'),out=path.join(root,'public');
fs.mkdirSync(path.join(out,'lib'),{recursive:true});
for(const file of ['index.html','app.js','styles.css','firebase-config.js','lib/campaign-resources.js'])fs.copyFileSync(path.join(root,file),path.join(out,file));
esbuild.buildSync({entryPoints:[path.join(root,'lib/upload-client.js')],bundle:true,format:'iife',globalName:'CampaignFileUpload',outfile:path.join(out,'upload-client.js'),minify:true});
console.log('Built public UI and private-upload client.');
