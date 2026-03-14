import codecs
def fix():
    with codecs.open('pipeline.py.bak', 'r', 'utf-8') as f:
        lines = f.readlines()
    for i in range(len(lines)):
        if '# Write live frame for Web UI' in lines[i]:
            lines[i] = '                # Write live frame for Web UI streaming (every 3rd frame to save I/O)\n'
        if 'if frame_idx % 3 == 0 or is_im:' in lines[i]:
            lines[i] = '                if frame_idx % 3 == 0 or is_im:\n'
        if 'cv2.imwrite(str(config.OUTPUT_DIR' in lines[i] and 'live_frame.jpg' in lines[i]:
            lines[i] = '                    cv2.imwrite(str(config.OUTPUT_DIR / "live_frame.jpg"), vis)\n'

    with codecs.open('pipeline.py', 'w', 'utf-8') as f:
        f.writelines(lines)

if __name__ == '__main__':
    fix()
