} else { 
  // NPC 자동 던지기
  if (condition === "inclusion") {
    // 기존 inclusion 로직 그대로 유지
    if (throws === maxThrows - 1) {
      target = 0;
    } else {
      do {
        target = Math.random() < 0.4 ? 0 : (Math.random() < 0.5 ? 1 : 2);

        if (target === 0) {
          npcChainCount = 0;
          lastNpcPair = null;
          break;
        } else {
          const newPair = [current, target].sort().join("-");
          if (newPair === lastNpcPair) {
            npcChainCount++;
          } else {
            npcChainCount = 1;
            lastNpcPair = newPair;
          }
        }
      } while (npcChainCount > 3);
    }
  } else if (condition === "exclusion") {
    // exclusion 로직
    if (throws < 5) {
      // 초반 5번 정도는 간헐적으로 참여자에게 패스
      target = Math.random() < 0.3 ? 0 : (Math.random() < 0.5 ? 1 : 2);
    } else {
      // 이후에는 절대 참여자에게 공이 가지 않음
      target = (Math.random() < 0.5 ? 1 : 2);
    }
  }
}
