#version 450

#extension GL_ARB_gpu_shader_int64 : enable
#extension GL_NV_shader_atomic_int64 : enable
#extension GL_NV_gpu_shader5 : enable

layout(local_size_x = 128, local_size_y = 1) in;

struct Vertex{
	float x;
	float y;
	float z;
	uint colors;
};

layout (std430, binding = 0) buffer point_data {
	Vertex vertices[];
};

layout (std430, binding = 1) buffer framebuffer_data {
	uint64_t ssFramebuffer[];
};

layout(location = 0) uniform mat4 uTransform;
layout(location = 1) uniform ivec2 uImageSize;

int linearToBlock(ivec2 c, ivec2 size) {
    const int SIZE = 32;
    const int SHIFT = 5; // findMSB(SIZE);
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

	uint globalID = gl_GlobalInvocationID.x;

	Vertex v = vertices[globalID];

	vec4 pos = uTransform * vec4(v.x, v.y, v.z, 1.0);
	pos.xyz = pos.xyz / pos.w;

	if(pos.w <= 0.0 || pos.x < -1.0 || pos.x > 1.0 || pos.y < -1.0 || pos.y > 1.0){
		return;
	}

	ivec2 pixelCoords = ivec2((pos.xy * 0.5 + 0.5) * uImageSize);
	// int pixelID = pixelCoords.x + pixelCoords.y * uImageSize.x;
	int pixelID = linearToBlock(pixelCoords.xy, uImageSize);

	int64_t depth = floatBitsToInt(pos.w);
	int64_t val64 = (depth << 24) | int64_t(v.colors);

	atomicMin(ssFramebuffer[pixelID], val64);
}

