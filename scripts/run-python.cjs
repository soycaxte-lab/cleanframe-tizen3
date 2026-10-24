const cp=require('node:child_process');
const result=cp.spawnSync(process.env.PYTHON||(process.platform==='win32'?'python':'python3'),['-B',...process.argv.slice(2)],{stdio:'inherit'});
if(result.error)console.error(result.error.message);
process.exit(result.status===null?1:result.status);