import codecs

def fix_file():
    with open('pipeline.py.bak', 'rb') as f:
        text = f.read().decode('utf-8')

    old_block = '                        self.vid_writer.write(vis)\n                          \n                  # Write live frame for Web UI streaming (every 3rd frame to save I/O)\n                  if frame_idx % 3 == 0 or is_im:\n                      cv2.imwrite(str(config.OUTPUT_DIR / "live_frame.jpg"), vis)\n\n                  if self.show_gui:'
    
    new_block = '                        self.vid_writer.write(vis)\n\n                # Write live frame for Web UI streaming\n                if frame_idx % 3 == 0 or is_im:\n                    cv2.imwrite(str(config.OUTPUT_DIR / "live_frame.jpg"), vis)\n\n                if self.show_gui:'

    text = text.replace(old_block, new_block)

    with open('pipeline.py', 'wb') as f:
        f.write(text.encode('utf-8'))

if __name__ == '__main__':
    fix_file()
