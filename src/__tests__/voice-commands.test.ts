import { VoiceCommandService } from '../services/voice-commands';
import type { STTService } from '../services/stt';

/**
 * 关键词匹配（_dispatch）为纯逻辑，无需真实录音/STT。
 * 通过类型断言访问私有方法，观测 onCommand 回调。
 */
function createService(debounceMs = 2000) {
  const stt = {
    speechToTextForCommand: jest.fn().mockResolvedValue(''),
  } as unknown as STTService;
  const svc = new VoiceCommandService(stt, debounceMs);
  const dispatch = (svc as unknown as { _dispatch: (text: string) => void })._dispatch.bind(svc);
  const onCommand = jest.fn();
  svc.onCommand = onCommand;
  return { svc, dispatch, onCommand };
}

describe('VoiceCommandService 关键词匹配', () => {
  it('"下一步" 触发 next，无 question', () => {
    const { dispatch, onCommand } = createService();
    dispatch('下一步');
    expect(onCommand).toHaveBeenCalledTimes(1);
    expect(onCommand).toHaveBeenCalledWith('next');
  });

  it('"再说一遍" 触发 repeat', () => {
    const { dispatch, onCommand } = createService();
    dispatch('再说一遍');
    expect(onCommand).toHaveBeenCalledWith('repeat');
  });

  it('ask 关键词优先于 next，避免"我想问下一步要做什么"被误判', () => {
    const { dispatch, onCommand } = createService();
    dispatch('我想问下一步要做什么');
    expect(onCommand).toHaveBeenCalledTimes(1);
    expect(onCommand).toHaveBeenCalledWith('ask', '下一步要做什么');
  });

  it('ask 关键词后无内容时 question 为 undefined', () => {
    const { dispatch, onCommand } = createService();
    dispatch('有个问题');
    expect(onCommand).toHaveBeenCalledWith('ask', undefined);
  });

  it('无关键词命中文本不触发回调', () => {
    const { dispatch, onCommand } = createService();
    dispatch('今天天气不错');
    expect(onCommand).not.toHaveBeenCalled();
  });

  it('空白文本不触发回调', () => {
    const { dispatch, onCommand } = createService();
    dispatch('   ');
    expect(onCommand).not.toHaveBeenCalled();
  });

  it('关键词出现在句中也能命中', () => {
    const { dispatch, onCommand } = createService();
    dispatch('饭好了叫我');
    expect(onCommand).toHaveBeenCalledWith('next');
  });

  it('debounce 窗口内的连续匹配只触发一次', () => {
    const { dispatch, onCommand } = createService(2000);
    dispatch('下一步');
    dispatch('下一步');
    expect(onCommand).toHaveBeenCalledTimes(1);
  });
});
