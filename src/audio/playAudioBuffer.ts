/** 返回可重复调用的停止函数，供动画结束、静音及组件卸载时释放音频资源。 */
export function playAudioBuffer(
  createBuffer: (context: BaseAudioContext) => AudioBuffer,
  label: string,
): () => void {
  let context: AudioContext | undefined;
  let source: AudioBufferSourceNode | undefined;
  let stopped = false;
  const reportError = (error: unknown) => console.warn(`${label}播放失败，对局可继续。`, error);

  function stop() {
    if (stopped) return;
    stopped = true;
    source?.disconnect();
    if (context && context.state !== 'closed') void context.close().catch(reportError);
  }

  async function start() {
    try {
      context = new AudioContext({ latencyHint: 'interactive' });
      source = context.createBufferSource();
      source.buffer = createBuffer(context);
      source.connect(context.destination);
      source.onended = stop;
      if (context.state === 'suspended') await context.resume();
      // 恢复声卡期间可能已悔棋或离开棋局，取消后不能再补播。
      if (!stopped) source.start();
    } catch (error) {
      if (!stopped) reportError(error);
      stop();
    }
  }

  void start();
  return stop;
}
