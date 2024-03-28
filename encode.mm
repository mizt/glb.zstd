#import <Foundation/Foundation.h>
#import "zstd.h"

int main(int argc, char *argv[]) {
	@autoreleasepool {
		NSString *src = @"./76.glb";
		NSData *glb = [[NSData alloc] initWithContentsOfFile:src];
		if(glb) {
			unsigned int length = glb.length;
			unsigned char *buf = new unsigned char[length];
			NSMutableData *dst = [[NSMutableData alloc] init];
			unsigned int ret = (unsigned int)ZSTD_compress(buf,length,glb.bytes,length,1);
			if(ret>=1) {
				[dst appendBytes:new unsigned int[1]{length} length:4];
				[dst appendBytes:buf length:ret];
				[dst writeToFile:[NSString stringWithFormat:@"./docs/%@.zstd",src] atomically:YES];
			}
			else {
				NSLog(@"%d",ret);
			}
			if(buf) delete[] buf;
			glb = nil;
		}
		else {
			NSLog(@"Error");
		}
	}
}