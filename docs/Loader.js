export const Loader = Object.freeze({
	
	parse:(url,data,init)=>{
		
		const toU32 = (arr,offset)=>{ 
			return arr[offset+3]<<24|arr[offset+2]<<16|arr[offset+1]<<8|arr[offset]; 
		};
		
		const bin = new Uint8Array(data);
		if(new TextDecoder().decode(bin.slice(4,8))==="zstd") {
			const src = new Uint8Array(Module.HEAPU8.buffer,Module._malloc(data.byteLength-8),data.byteLength-8);
			for(let k=0; k<data.byteLength-8; k++) src[k] = bin[8+k];
			const length = toU32(bin,0);
			const dst = new Uint8Array(Module.HEAPU8.buffer,Module._malloc(length),length);
			const Decode = Module.cwrap("decode","number",["number","number","number","number"]);
			if(length==Decode(dst.byteOffset,length,src.byteOffset,data.byteLength-8)) {
				const U8 = new Uint8Array(length);
				for(let k=0; k<length; k++) U8[k] = dst[k];
				if(new TextDecoder().decode(U8.slice(0,4))==="glTF") {
					const size = toU32(U8,4*3);
					if(new TextDecoder().decode(U8.slice(4*4,4*4+4))==="JSON") {
						const json = JSON.parse(new TextDecoder().decode(U8.slice(4*5,4*5+size)));
						if(new TextDecoder().decode(U8.slice(4*5+size+4*1,4*5+size+4*1+3))==="BIN") {
							const offset = 4*5+size+4*2;
							const bufferViews = json["bufferViews"];
							const byteOffsets = [bufferViews[0]["byteOffset"],bufferViews[1]["byteOffset"],bufferViews[2]["byteOffset"],bufferViews[3]["byteOffset"]];
							const byteLengths = [bufferViews[0]["byteLength"],bufferViews[1]["byteLength"],bufferViews[2]["byteLength"],bufferViews[3]["byteLength"]];
							const F32 = (new Float32Array(U8.buffer)).slice(offset>>2);
							const v  = F32.slice(byteOffsets[0]>>2,(byteOffsets[0]+byteLengths[0])>>2);
							const vt = F32.slice(byteOffsets[1]>>2,(byteOffsets[1]+byteLengths[1])>>2);
							const bytes = byteLengths[2]/json["accessors"][2]["count"];
							if(bytes==2||bytes==4) {
								const f = (bytes==2)?
								(new Uint16Array(U8.buffer)).slice((offset+byteOffsets[2])>>1,(offset+byteOffsets[2]+byteLengths[2])>>1):
								(new Uint32Array(U8.buffer)).slice((offset+byteOffsets[2])>>2,(offset+byteOffsets[2]+byteLengths[2])>>2);
								if(v.length&&vt.length&&f.length) {
									const image = U8.slice(offset+byteOffsets[3],offset+byteOffsets[3]+byteLengths[3]);
									const result = {};
									result[url] = {
										"v":v,
										"vt":vt,
										"f":f,
										"TM":json["TM"],
										"PM":json["PM"],
										"img":URL.createObjectURL(new Blob([image.buffer],{type:json["images"][0]["mimeType"]})),
										"bytes":bytes
									}
									init(result);
								}
							}
						}
					}
				}
			}
			
			Module._free(src);
			Module._free(dst);
		}
	},
	
	load:(url,init)=>{
		
		let list = [];
		
		if(typeof(url)==="string") {
			list.push(url);
		}
		else if(Array.isArray(url)) {
			list = url;
		}
				
		if(list.length>=1) {
			
			let loaded = 0;
			let data = {};
			
			const onload = (result) => {
				const key = Object.keys(result)[0];
				data[key] = result[key];
				loaded++;
				if(loaded===list.length) {
					init(data);
				}
			};
			
			const load = (url) => {
				fetch(url).then(response=>response.blob()).then(data=>{
					const fr = new FileReader();
					fr.onloadend = ()=>{
						Loader.parse(url,fr.result,onload);
					};
					fr.readAsArrayBuffer(data)
				}).catch(error=>{
					console.error(error);
				});
			}
			
			for(var n=0; n<list.length; n++) {
				load(list[n]);
			}
		}
	}
});