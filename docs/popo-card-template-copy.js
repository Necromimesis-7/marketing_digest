defineBlitz({
  data() {
    return {
      columnTitle: "创意营销案例分享",
      title: "测试标题：本周创意营销案例分享",
      summary: "这里是卡片摘要。如果你在预览中能看到这段文字，说明 JS 默认数据已经生效；正式发送时会被后台传入的数据覆盖。",
      articleUrl: "https://example.com",
      coverUrl: "",
      hasCover: false,
      hasItems: true,
      itemList: [
        {
          index: 1,
          title: "案例一：高概念创意传播",
          line: "1. 案例一：高概念创意传播",
          url: "https://example.com/case-1"
        },
        {
          index: 2,
          title: "案例二：社区共创内容扩散",
          line: "2. 案例二：社区共创内容扩散",
          url: "https://example.com/case-2"
        },
        {
          index: 3,
          title: "案例三：主机游戏发布节点整合营销",
          line: "3. 案例三：主机游戏发布节点整合营销",
          url: "https://example.com/case-3"
        }
      ],
      item1Title: "案例一：高概念创意传播",
      item2Title: "案例二：社区共创内容扩散",
      item3Title: "案例三：主机游戏发布节点整合营销",
      item4Title: "",
      item5Title: "",
      item1Visible: true,
      item2Visible: true,
      item3Visible: true,
      item4Visible: false,
      item5Visible: false,
      readMoreText: "阅读全文"
    };
  },

  openArticle() {
    if (!this.data.articleUrl) {
      pp.showToast({
        title: "阅读链接为空"
      });
      return;
    }

    pp.startWebView({
      url: this.data.articleUrl
    });
  },

  openItem(payload) {
    const item = payload && payload.item;
    const url = item && item.url;

    if (!url) {
      this.openArticle();
      return;
    }

    pp.startWebView({
      url
    });
  }
});
