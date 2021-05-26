log("compute_tiled.js loaded");

function render_compute_tiled(node, view, proj, target){

	GLTimestamp("compute-tiled-start");

	// TODO support resizing
	let width = 3000;
	let height = 2000;

	if(typeof computeState_tiled === "undefined"){

		let pathRender = `${rootDir}/modules/compute_tiled/render.cs`;
		let pathResolve = `${rootDir}/modules/compute_tiled/resolve.cs`;

		let csRender = new Shader([{type: gl.COMPUTE_SHADER, path: pathRender}]);
		let csResolve = new Shader([{type: gl.COMPUTE_SHADER, path: pathResolve}]);

		csRender.watch();
		csResolve.watch();

		// TODO support resizing
		let numPixels = width * height; 
		let framebuffer = new ArrayBuffer(numPixels * 8);

		let ssboFramebuffer = gl.createBuffer();
		gl.namedBufferData(ssboFramebuffer, framebuffer.byteLength, framebuffer, gl.DYNAMIC_DRAW);

		let fbo = new Framebuffer();

		computeState_tiled = {csRender, csResolve, numPixels, ssboFramebuffer, fbo};
	}

	let fbo = computeState_tiled.fbo;

	fbo.setSize(target.width, target.height);

	let mat32 = new Float32Array(16);
	let transform = new Matrix4();
	let world = node.transform;
	transform.copy(Matrix4.IDENTITY);
	transform.multiply(proj).multiply(view).multiply(world);
	mat32.set(transform.elements);

	let tmp = new Matrix4();
	tmp.multiply(view).multiply(world);
	// log(proj.elements);

	//log(transform.elements)


	{ // RENDER
		GLTimestamp("compute-tiled-render-start");

		let {csRender, ssboFramebuffer} = computeState_tiled;

		gl.bindFramebuffer(gl.FRAMEBUFFER, 0);
		
		gl.useProgram(csRender.program);

		gl.uniformMatrix4fv(csRender.uniforms.uTransform, 1, gl.FALSE, mat32);

		gl.bindBufferBase(gl.SHADER_STORAGE_BUFFER, 1, ssboFramebuffer);

		let pointsLeft = node.numPoints;
		let batchSize = 134 * 1000 * 1000;

		for(let buffer of node.glBuffers){
			gl.bindBufferBase(gl.SHADER_STORAGE_BUFFER, 0, buffer.vbo);

			let {width, height} = fbo;
			gl.uniform2i(csRender.uniforms.uImageSize, width, height);

			let numPoints = Math.max(Math.min(pointsLeft, batchSize), 0);
			let groups = parseInt(numPoints / 128);

			gl.dispatchCompute(groups, 1, 1);

			pointsLeft = pointsLeft - batchSize;
		}

		gl.useProgram(0);
		GLTimestamp("compute-tiled-render-end");
	}

	gl.memoryBarrier(gl.ALL_BARRIER_BITS);

	{ // RESOLVE
		GLTimestamp("compute-tiled-resolve-start");

		let {csResolve, ssboFramebuffer} = computeState_tiled;

		gl.useProgram(csResolve.program);

		gl.bindBufferBase(gl.SHADER_STORAGE_BUFFER, 1, ssboFramebuffer);
		gl.bindImageTexture(0, fbo.textures[0], 0, gl.FALSE, 0, gl.READ_WRITE, gl.RGBA8UI);

		let groups = [
			Math.floor(1 + fbo.width / 16),
			Math.floor(1 + fbo.height / 16),
			1
		];

		gl.dispatchCompute(...groups);

		gl.useProgram(0);
		GLTimestamp("compute-tiled-resolve-end");
	}

	gl.memoryBarrier(gl.ALL_BARRIER_BITS);
	
	gl.blitNamedFramebuffer(fbo.handle, target.handle, 
		0, 0, fbo.width, fbo.height, 
		0, 0, target.width, target.height, 
		gl.COLOR_BUFFER_BIT, gl.LINEAR);

	// {
	// 	let [x, y] = [800, 500];
	// 	let [width, height] = [100, 50];
	// 	let multiplier = 8;
	// 	gl.blitNamedFramebuffer(fbo.handle, target.handle, 
	// 		x, y, x + width, y + height,
	// 		10, 10, width * multiplier, height * multiplier, 
	// 		gl.COLOR_BUFFER_BIT, gl.NEAREST);
	// }

	GLTimestamp("compute-tiled-end");

}




renderPointCloudCompute = renderComputeBasic;

"render compute"