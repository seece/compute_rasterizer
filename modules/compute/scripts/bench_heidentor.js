

if(typeof e4called === "undefined"){
	e4called = true;
	
	let las = loadLASProgressive("D:/dev/pointclouds/archpro/heidentor.las");

	let pc = new PointCloudProgressive("testcloud", "blabla");
	pc.boundingBox.min.set(...las.boundingBox.min);
	pc.boundingBox.max.set(...las.boundingBox.max);

	log(pc.boundingBox);

	let handles = las.handles;

	let attributes = [
		new GLBufferAttribute("position", 0, 3, gl.FLOAT, gl.FALSE, 12, 0),
		new GLBufferAttribute("color",    1, 4, gl.UNSIGNED_BYTE, gl.TRUE, 4, 12),
		// new GLBufferAttribute("value", 1, 4, gl.INT, gl.FALSE, 4, 12, {targetType: "int"}),
	];

	let bytesPerPoint = attributes.reduce( (p, c) => p + c.bytes, 0);

	let maxPointsPerBuffer = 134 * 1000 * 1000;
	let numPointsLeft = las.numPoints;

	let glBuffers = handles.map( (handle) => {

		let numPointsInBuffer = numPointsLeft > maxPointsPerBuffer ? maxPointsPerBuffer : numPointsLeft;
		numPointsLeft -= maxPointsPerBuffer;

		let glbuffer = new GLBuffer();

		glbuffer.attributes = attributes;

		gl.bindVertexArray(glbuffer.vao);
		glbuffer.vbo = handle;
		gl.bindBuffer(gl.ARRAY_BUFFER, glbuffer.vbo);

		for(let attribute of attributes){

			let {location, count, type, normalize, offset} = attribute;

			gl.enableVertexAttribArray(location);

			if(attribute.targetType === "int"){
				gl.vertexAttribIPointer(location, count, type, bytesPerPoint, offset);
			}else{
				gl.vertexAttribPointer(location, count, type, normalize, bytesPerPoint, offset);
			}
		}

		gl.bindVertexArray(0);

		glbuffer.count =  numPointsInBuffer;

		return glbuffer;
	});

	pc.glBuffers = glBuffers;

	let s = 0.3;
	pc.transform.elements.set([
		s, 0, 0, 0, 
		0, 0, -s, 0, 
		0, s, 0, 0, 
		-10, 1.4, -11, 1, 
	]);

	scene.root.add(pc);

	listeners.update.push(() => {

		if(pc.numPoints !== las.numPoints){
			//log(las.numPoints);
		}
		pc.numPoints = las.numPoints;
		
	});

}

window.width = 1600;
window.height = 1080;

// window.width = 3000;
// window.height = 2000;

window.x = 2560;
window.y = 0;

view.set(
	[-10.978, 3.496, -14.765], 
	[-7.271, 2.721, -13.455]
);

camera.fov = 100;
camera.near = 0.1;


MSAA_SAMPLES = 1;