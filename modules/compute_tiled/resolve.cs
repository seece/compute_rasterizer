
#version 450

#extension GL_ARB_gpu_shader_int64 : enable
#extension GL_NV_shader_atomic_int64 : enable

// 
// Transfers the rendering results from render.cs from an SSBO into an OpenGL texture.
// 

layout(local_size_x = 16, local_size_y = 16) in;

layout (std430, binding=1) buffer framebuffer_data {
	uint64_t ssFramebuffer[];
};

layout(rgba8ui, binding = 0) uniform uimage2D uOutput;

uvec4 colorAt(uint pixelID){
	uint64_t val64 = ssFramebuffer[pixelID];
	uint ucol = uint(val64 & 0x00FFFFFFUL);

	if(ucol == 0){
		return uvec4(0, 0, 0, 255);
	}

	vec4 color = 255.0 * unpackUnorm4x8(ucol);
	uvec4 icolor = uvec4(color);

	return icolor;
}

int linearToBlock(ivec2 c, ivec2 size) {
    const int SIZE = 32;
    const int SHIFT = 5; //findMSB(SIZE);
    const int MASK = SIZE - 1;
    const int B2 = (1 << SHIFT) << SHIFT;
    const int bw = size.x >> SHIFT;
    int bx = c.x >> SHIFT;
    int by = c.y >> SHIFT;
    int lx = c.x & MASK;
    int ly = c.y & MASK;
    return by*B2*bw + bx * B2 + ly * SIZE + lx;
}

void main(){
	uvec2 id = gl_LocalInvocationID.xy + gl_WorkGroupSize.xy * gl_WorkGroupID.xy;
	ivec2 imgSize = imageSize(uOutput);

	if(id.x >= imgSize.x){
		return;
	}

	// uint pixelID = id.x + id.y * imgSize.x;
	uint pixelID = uint(linearToBlock(ivec2(id.xy), imgSize.xy));

	uvec4 icolor = colorAt(pixelID);
	imageStore(uOutput, ivec2(id), icolor);

	// reset depth and background color
	// rgb(60, 50, 30) = 0x3c321e
	ssFramebuffer[pixelID] = 0xffffffffff3c321eUL;
}

