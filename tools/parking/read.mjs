import { Dwg_File_Type, LibreDwg } from '@mlightcad/libredwg-web'
import fs from 'fs'
const lib = await LibreDwg.create('./node_modules/@mlightcad/libredwg-web/wasm/')
const buf = fs.readFileSync(process.argv[2])
const dwg = lib.dwg_read_data(buf, Dwg_File_Type.DWG)
const db = lib.convert(dwg)
fs.writeFileSync('db.json', JSON.stringify(db, (k,v)=> typeof v==='bigint'? Number(v): v))
console.log(Object.keys(db), db.entities?.length)
