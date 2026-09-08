# 鲸息（Whale Breath）设计规范

> 版本基线：V1.0.3 Pure Breath ｜ 设计基线：Jingxi Icon System V1.5
> 本文全部内容提炼自仓库实现事实：`lib/client.js`（样式与组件）、`assets/icons/manifest.json`（图标体系）、`README.md`（产品叙事）。每条规则附出处（选择器 / 文件：行号），不写空话。

---

## 1. 设计原则

| 原则 | 规则 | 出处 |
| --- | --- | --- |
| Pure Breath（别无他物） | 只呈现基础调用事实与呼吸轨迹：五张事实卡、一条呼吸曲线、一条事件轨。没有计费、没有额度、没有面板迷宫；侧栏入口点击直达浮层，无中间页 | `README.md:9,26-28`；`lib/client.js:11-13`（V1.0.1 剥离注释） |
| fail-closed（缺数据宁空不假） | 无真实数据 = 空轨道 / 未知态 / 灰调「—」，绝不伪造轨迹、不把估算伪装成精确事实；空态本身就是信息披露 | `README.md:66`；`lib/client.js:16`（缺失数据保持空轨道/未知状态）、`lib/client.js:1098`（estimated/缺失一律用可证明的通用标签） |
| DSH Native（token 托管视觉归属） | 外壳、按钮、遮罩、全部颜色归属宿主 tokens（`--dsw-alias-*`），亮暗主题自然跟随；插件不自建色板 | `README.md:68,135`（Native by default）；`lib/client.js:411` 起全部 `var(--dsw-alias-*)` |
| 呼吸叙事（节奏→量级→健康） | 事实卡与整体阅读顺序按「节奏 → 量级 → 健康」组织：先看快不快（速度/时长/轮次），再看多少（Token），最后看好不好（工具/异常/缓存） | `README.md:33,46`；`lib/client.js:2493-2497`（五卡渲染顺序） |
| Cache First | 事实卡优先读缓存投影；同会话刷新保留上一帧并提示「更新中」，不清空不闪烁 | `README.md:134`；`lib/client.js:98-105`（保帧刷新） |
| 只读默认 | 后端写端点默认不注册；界面即只读遥测解读层，运维能力是可审计的可选模块 | `README.md:109-116`；`lib/client.js:15` |

---

## 2. 色彩体系

### 2.1 Token 分层表

鲸息不定义任何十六进制主题色（仅轨迹三色例外，见 2.4），全部颜色经 `--dsw-alias-*` 引用宿主。

| 层级 | Token | 用途 | 出处（示例选择器） |
| --- | --- | --- | --- |
| 一级文字 | `--dsw-alias-label-primary` | 标题、数值、主读数、强调标签、曲线线色 | `.jx-fc`（client.js:411）、`.jx-fact__value`（:862）、`.jx-curve-line`（:613） |
| 二级文字 | `--dsw-alias-label-secondary` | 正文信息、单位、说明、图标默认色、关闭/刷新按钮 | `.jx-fc-entry__status`（:432）、`.jx-header-fact__icon`（:498）、`.jx-dialog-close`（:494） |
| 三级文字 | `--dsw-alias-label-tertiary` | 弱提示、时间戳、空态值、轴刻度、分隔符、等待态 | `.jx-header-fact__label`（:500）、`.jx-curve-yaxis`（:606）、`.jx-fact[data-empty] .jx-fact__value`（:865） |
| 品牌主线 | `--dsw-alias-brand-primary` | 呼吸曲线、事件刻度、游标、active 态、进度填充、主读数 | `.jx-curve-svg`（:611）、`.jx-curve-event-tick`（:582）、`.jx-breath-native .jx-primary strong`（:682） |
| 状态-成功 | `--dsw-alias-state-success-primary` | 完成态、缓存高质量、stable 线程、自动刷新开启 | `.jx-event-rail[data-state="complete"]`（:533）、`.jx-cache-quality[data-quality="high"]`（:518） |
| 状态-错误 | `--dsw-alias-state-error-primary` | 异常/重试/压缩事件、failed 线程、错误状态行 | `.jx-curve-event-tick[data-event-kind="retry"]`（:588-592）、`.jx-settings-state[data-state="error"]`（:650） |
| 状态-警告 | `--dsw-alias-state-warn-primary` / `--dsw-alias-state-warning-primary` | 工具事件刻度、峰值标注、快照过期提醒、warn 状态行 | `.jx-curve-event-tick[data-event-kind="tool"]`（:585）、`.jx-curve-peak`（:604）、`.jx-settings-state[data-state="warn"]`（:651） |
| 状态-信息 | `--dsw-alias-state-info-primary` | 子代理 running 态（兜底 brand-primary） | `.jx-subagent-dock__item[data-status="running"]`（:849） |
| 分隔线 | `--dsw-alias-border-l2` | 全部细线：卡片边、分区线、曲线框、虚线参考线 | `.jx-fc-divider`（:444）、`.jx-curve`（:520）、`.jx-fold`（:881） |
| 焦点环 | `--dsw-alias-focus-ring` | 全部 `:focus-visible` 2px 外描边 | client.js:656-657 |
| 交互底色 | `--dsw-alias-interactive-bg-hover` / `--dsw-alias-interactive-bg-selected` | 侧栏按钮 hover / rail 选中块 | `.jx-fc-btn:hover`（:415）、`.jx-fc-btn[data-jx-selected]`（:442） |
| 层底色 | `--dsw-alias-bg-layer-1` / `--dsw-alias-bg-layer-2` / `--dsw-alias-fill-tertiary` | 浮层卡片底、阶段卡底、进度/轨道槽 | `.jx-trajectory-strip`（:709）、`.jx-phase-story__card`（:722）、`.jx-progress-card__bar`（:821） |

### 2.2 使用规则：何级文字用于何类信息

| 规则 | 出处 |
| --- | --- |
| 数值与标题永远一级；标签与单位永远二/三级——同一张卡内「值重、标轻」 | `.jx-fact__value`（primary，:862）vs `.jx-fact__label`（secondary，:860） |
| 空值不等于普通值：值为「—」时整卡降级为三级灰、字重 600→500 | `.jx-fact[data-empty="true"] .jx-fact__value`（:865）；`data-empty` 注入 client.js:2227 |
| 状态词着色即语义：active=品牌蓝、stable=成功绿、failed=错误红，三级灰=等待 | `.jx-fc-entry__status[data-thread-status=*]`（:433-435） |
| 品牌蓝只给「呼吸主线」（曲线、游标、活跃态），不用于普通装饰 | `.jx-curve-line`（:613）、`.jx-fact[data-metric="status"][data-state="working"]`（:867） |
| 警告色给工具事件与峰值；错误色给重试/压缩/异常——曲线图例三色互不混用 | client.js:585-593；`.jx-curve-legend__item[data-kind]`（:599-601,754） |

### 2.3 暗色兜底策略（兜底链）

| 规则 | 出处 |
| --- | --- |
| 每个 token 引用必须带兜底：文字类兜底 `currentColor`，线条/底色类兜底 `transparent` | 全文范式 `var(--dsw-alias-label-primary,currentColor)`（:411）、`var(--dsw-alias-border-l2,transparent)`（:444） |
| 品牌色允许二级兜底：brand → state-business-primary → currentColor | `.jx-curve-event-tick`（:582）、`.jx-curve-svg`（:611） |
| 状态色允许同类兜底：warn-label → warn-primary → currentColor | `.jx-session-lane__marker[data-kind="tool"]`（:570） |
| 混色用 `color-mix(in srgb, …)` 派生透明度变体，不写死 rgba 主题色（唯一例外：rail 选中块无 token 时的参考图浅蓝 `rgba(64,128,255,0.12)` 兜底） | client.js:568-569,584,730-732；例外 :442 |

### 2.4 轨迹三色（唯一插件自有色）

| 规则 | 出处 |
| --- | --- |
| 会话轨迹迷你时间轴的 输入/模型/工具 三色为插件自定义属性：亮 `#b9a1f1/#f2b17f/#9bbff5`；暗色下输入色让位给 brand-primary | `.jx-breath-native{--jx-trajectory-*}`（client.js:742-743） |

---

## 3. 字体阶梯

### 3.1 主阶梯（px / 字重 / 用途）

| 字号 | 字重 | 用途 | 出处 |
| --- | --- | --- | --- |
| 32 | 600 | 浮层主读数（实时速度 strong），行高 34，品牌色 | `.jx-breath-native .jx-primary strong`（:682） |
| 20 | 600 | 浮层标题「鲸息 · 运行轨迹」，行高 28，字距 -.015em | `.jx-breath-native .jx-title`（:669） |
| 16 | 500 | 通用对话框标题基准 | `.jx-title`（:491） |
| 14 | 500/600 | 侧栏入口标签（500）、事实卡数值（600，字距 -.02em）、曲线区标题（600）、设置行（500） | `.jx-fc-entry__label`（:431）、`.jx-fact__value`（:862）、`.jx-curve-title`（:576）、`.jx-settings-row`（:635） |
| 13 | 400/600 | 顶栏胶囊数值（600 tabular-nums）、曲线标签（600）、会话读数正文 | `.jx-header-fact__value`（:501）、`.jx-curve-label`（:573）、`.jx-session-readout`（:557） |
| 12 | 400/600 | 侧栏状态行、速率、设置提示、折叠 summary（600）、最近轮次 | `.jx-fc-status`（:798）、`.jx-fold__summary`（:882）、`.jx-recent`（:537） |
| 11 | 400/600 | 次级信息主层：胶囊/事实卡标签、meta、图例、事件轨、来源标注；600 用于标签强调 | `.jx-header-fact__label`（:500）、`.jx-fact__label`（:860）、`.jx-curve-legend`（:597）、`.jx-recent__label`（:538） |
| 10 | 400/600 | 纯装饰刻度层：Y/X 轴刻度、峰值、倒计时、阶段卡正文、子代理 meta | `.jx-curve-yaxis`（:606）、`.jx-curve-peak`（:604）、`.jx-auto-refresh-note`（:506）、`.jx-phase-story__card p`（:733） |

### 3.2 断点衍生值（不属主阶梯，仅响应式降档）

| 派生值 | 场景 | 出处 |
| --- | --- | --- |
| 28 / 30 | ≤520px 时主读数 32→28 | client.js:662,713 |
| 17 / 15 | ≤520px / ≤360px 时标题 20 降档 | client.js:713,908 |
| 18 / 24 | 缓存副读数（18/600）；设置行图标 glyph 24px | client.js:688,637 |
| 9 | ≤360px 时事实卡 label/meta 极限降档（底线，不得再小） | client.js:908 |

### 3.3 字重规则

| 规则 | 出处 |
| --- | --- |
| 全项目只用 400 / 500 / 600 三档；数值一律 600，标签 500，弱提示 400 | `.jx-fact__value`（600，:862）、`.jx-settings-state__value`（500，:647）、`.jx-fc-entry__status`（400，:432） |
| 数字信息一律 `font-variant-numeric:tabular-nums` 防跳动 | `.jx-header-fact__value`（:501）、`.jx-session-readout`（:557）、`.jx-recent-row`（:540） |

---

## 4. 间距与圆角

### 4.1 间距阶梯（px）

| 值 | 用途 | 出处 |
| --- | --- | --- |
| 4 | 最小间隙：基线对齐的元素间（label/value、分隔符）、紧凑 padding | `.jx-dialog-actions{gap:4px}`（:492）、`.jx-header-fact__copy{gap:4px}`（:499）、`.jx-fc-entry{padding:4px 8px}`（:424） |
| 6 | 卡内小间隙：胶囊内 icon-copy、状态行、事件轨元素 | `.jx-header-fact{gap:8px;padding:4px 10px}`（:497）、`.jx-fc-status{gap:7px}`（:798）、`.jx-breath-facts{gap:6px 12px}`（:855） |
| 8 | 标准元素间隙：header、图例、卡内 lockup | `.jx-header{gap:12px}`（:488）、`.jx-fact__lockup{gap:8px}`（:857）、`.jx-curve-title-row{gap:8px}`（:760） |
| 12 | 区块间标准距：header 内组、阶段卡 heading、轨迹轴 | `.jx-phase-story__heading{gap:12px}`（:718）、`.jx-settings-row{gap:12px}`（:635） |
| 16 | 区段间距：设置 body、折叠区、轨迹条上距 | `.jx-settings-body{gap:16px}`（:639）、`.jx-breath-folds{gap:10px;margin-top:16px}`（:880） |
| 18 | 浮层 body 水平内边距（8px 18px） | `.jx-breath-body{padding:8px 18px 8px}`（:854） |

### 4.2 圆角阶梯（px）

| 值 | 用途 | 出处 |
| --- | --- | --- |
| 4 | 徽标、焦点环小圆角 | `.jx-demo-badge{border-radius:4px}`（:528）、focus-visible（:657） |
| 8 | 按钮、胶囊、输入级控件、阶段卡 | `.jx-header-fact{border-radius:8px}`（:497）、`.jx-dialog-close`（:494）、`.jx-phase-story__card`（:722） |
| 12 | 容器级：侧栏按钮、rail 选中块、浮层卡片、折叠卡 | `.jx-fc-btn{border-radius:12px}`（:414）、`.jx-trajectory-strip`（:709）、`.jx-fold`（:881） |
| 999 | 全圆轨道：进度条、轨迹段标记 | `.jx-progress-card__bar`（:821）、`.jx-session-lane__marker`（:748） |

### 4.3 孤值教训

| 教训 | 规则 | 出处 |
| --- | --- | --- |
| 历史上曾出现 9px 间距与 620 字重两处孤值，破坏阶梯一致性，已在视觉审查中归位（9→8/12 邻近档，620→600） | 新代码禁止引入阶梯外孤值；确需新值必须回到本表登记 | V1.0.3「视觉优化版」审查记录（`README.md:33-34`）；现行阶梯见 3.3 / 4.1 |

---

## 5. 组件解剖

### 5.1 侧栏入口（FooterStatusCapsule，wide / rail 双形态）

| 要素 | 规则 | 出处 |
| --- | --- | --- |
| 槽位 | `sidebar.footer.action`，order 90，label「鲸息」 | client.js:2877-2879 |
| wide 结构 | 上细线 → 入口行（20px 官方鲸鱼 + 「鲸息 · {状态短文案}」+ 右侧 tok/s）→ 状态块（dot+状态词+Turn 标签+三步骤）→ 下细线；无快捷操作行、无版本行 | client.js:2721-2749（重排注释与结构） |
| 光学对齐 | 入口经 -4px 与宿主设置行共享 X=26px 光学轴；鲸鱼保持 20px 原生尺寸，不套假槽 | client.js:417-419 |
| rail 结构 | 40×40 按钮居中 20px 鲸鱼；浮层打开时 `data-jx-selected` + 宿主选中 token 底色（圆角 12） | client.js:436-442,2751-2764 |
| 速率显示 | 五档映射（实时/估算/最近/平均/等待速度数据）；failed 态隐藏速率，避免「已中断 + 最近 125 tok/s」自相矛盾 | client.js:2689-2690,2738-2745 |
| stale 标注 | 数据较旧追加「 · 数据较旧」，更新时刻来自真实提交帧，无时间标记只显示「数据较旧」 | client.js:2708-2713 |

### 5.2 顶栏胶囊（header-fact）

| 要素 | 规则 | 出处 |
| --- | --- | --- |
| 结构 | icon 20px（二级色）+ label 11px（三级）+ value 13px/600（一级 tabular-nums），横向基线排列 | client.js:944-951；`.jx-header-fact*`（:496-502） |
| 数量与内容 | 固定两颗：速度（实时/估算/平均/最近）、缓存命中率（全页唯一出现位） | client.js:2451-2467；B8 注释 :1848 |
| 等待态 | 无速度值时 value 降档 12px/500/三级灰，meta 显示「等待速度数据」 | `.jx-header-fact[data-state="waiting"]`（:502）；client.js:2456 |
| 右侧操作 | 自动刷新开关（含「自动刷新 · Ns」倒计时）+ 刷新钮 + 关闭钮，28px 控件高 | client.js:954-971；`.jx-dialog-auto-refresh__note`（:493） |

### 5.3 五张事实卡（breath-facts）

| 要素 | 规则 | 出处 |
| --- | --- | --- |
| 排列 | 「节奏 → 量级 → 健康」：会话时长（含运行号）→ 轮次·步数 → Token 总量 → 工具调用 → 异常/重试 | client.js:2493-2497；`README.md:46` |
| 卡结构 | icon 20px + label 11px + value 14px/600 + meta 11px；5 列 grid，≤560px 3 列，≤360px 2 列 | `.jx-fact*`（:856-865）；断点 :892,894 |
| 数据纪律 | 样例数字不硬编码；缺失值「—」/meta「暂无」，时长卡优先会话墙钟跨度、无轨迹回退 Turn 时长 | client.js:2361,2423-2424 |
| 语义着色 | status 卡 complete=绿 / working=蓝 / error=红；cache 卡高质量/中质量=绿；rate 卡 icon=蓝 | client.js:866-874 |

### 5.4 呼吸曲线（Breath Curve）

| 要素 | 规则 | 出处 |
| --- | --- | --- |
| 布局 | grid：32px Y 轴轨 + 1fr 绘图区；桌面高 340px（plot 308 + x 轴 32），矮屏/窄屏降 210px | `.jx-curve-grid`（:605）；client.js:774-781；降档 :899,905,909 |
| 曲线 | SVG 线宽 1.8、圆角线帽、面积层 opacity .12、品牌蓝；95 分位防离群压扁、轴容纳真峰值×1.1 | client.js:2550-2551；`.jx-curve-area`（:612）；B6 注释 :1405 |
| Y 轴 | 10px 三级灰右对齐刻度，tabular-nums | `.jx-curve-yaxis`（:606） |
| 事件刻度 | 竖线+圆点：tool=警告色、retry/compaction=错误色、其余=品牌蓝 28% 混色；只画 tool/retry/compaction 三类真实事件 | client.js:582-593,1276,1321 |
| 游标 | live=「Now」品牌蓝虚线；complete=「End」三级灰虚线右对齐 | `.jx-curve-cursor`（:616-618）；trajectoryNow client.js:1671-1685 |
| 图例 | 右对齐圆点图例（速度/工具/异常；cache 命中率全页唯一在头部，不入图例）；空态降级灰字+空心标记 | `.jx-curve-legend*`（:597-603）；B8 注释 :1848 |
| X 轴 | 10px 时间刻度，首尾刻度贴边防溢出（start 不移位 / end -100%） | `.jx-curve-xaxis__tick[data-edge]`（:620-622） |
| 来源标注 | 曲线头右侧标注轨迹来源（实时会话/快照/当前 Turn + 点数段数） | trajectorySourceLabel client.js:1618-1628 |

### 5.5 Event Rail（事件轨）

| 要素 | 规则 | 出处 |
| --- | --- | --- |
| 结构 | 6px 圆点 marker + 状态词 label（600 一级）+ detail（三级）；working/complete=实心点，其余空心点 | `.jx-event-rail*`（:530-536） |
| 着色 | complete=绿、error=红、其余二级灰 | client.js:533-534 |
| 位置 | 曲线区下方、上下细线夹持的单行语义轨，不扩张为面板 | client.js:2575；`.jx-breath-surface .jx-event-rail`（:594） |

### 5.6 阶段故事（Phase Story）

| 要素 | 规则 | 出处 |
| --- | --- | --- |
| 六阶段 | 启动(蓝)→加速(紫)→巡航(绿)→扰动(橙)→收敛(红)→完成(蓝)；由真实速度、工具节点和结束状态推导 | phaseStoryItems client.js:2142-2149；summary 文案 :2179 |
| 激活逻辑 | live 时：有工具事件=扰动；≥3 采样=巡航；≥2=加速；否则启动 | phaseStoryActiveKey client.js:2151-2161 |
| 卡片 | 7px 语义色点 + 11px/600 标题 + 10px 正文；active 卡品牌蓝描边+光晕，error 卡红描边，complete 卡绿描边 | `.jx-phase-story__card*`（:722-733） |
| 折叠形态 | 默认 compact details：summary 一行呈现当前阶段叙事标题，展开见 6 卡 rail；卡间虚线 connector ≤820px 隐藏 | client.js:2174-2206；`.jx-phase-story__connector`（:734-735） |
| 布局 | 6 列 grid，≤820px 3 列，≤520px 2 列 | client.js:721,735-736 |

### 5.7 空态（BreathEmptyState）

| 要素 | 规则 | 出处 |
| --- | --- | --- |
| 范式 | 28px 鲸鱼锚点（官方 FishLogo，idle 三级灰）+ 居中短标题（13px/600 一级）+ 一行说明（11px 三级）+ 错误时附「重试」钮；`role="status"` `aria-live="polite"` | client.js:2129-2137；`.jx-curve-empty`（:524-527） |
| 文案分层 | 无会话数据=「当前会话暂无可绘制事件」；会话采样不足=「速度采样不足」（区分 session/turn 两种 detail）；无 Turn=「等待第一轮」 | curveEmptyCopy client.js:2123-2128 |
| 错误态 | 加载失败标题换「呼吸节奏刷新失败」，正文放真实错误文案（含 12s 超时文案），给重试入口 | client.js:2133-2135；错误文案 :142 |
| 诚实留白 | 空态保留曲线框（细线边界可见），数据层如实报告采样不足，不用装饰填充假装有图 | client.js:629-632（注释与样式） |

### 5.8 折叠区（folds / details）

| 要素 | 规则 | 出处 |
| --- | --- | --- |
| 详情折叠 | 「详情 ▾」承载子代理 Dock + 进度卡 + 会话摘要 + 最近 5 轮 + 阶段故事 | client.js:2577-2602 |
| 会话摘要 | `jx-fold`：12px/600 标题 + 右侧三级 hint；8 行 dt/dd 摘要栅格，缺值「—」 | client.js:2278-2306；`.jx-summary-grid`（:887-889） |
| 最近 5 轮 | 行结构：#轮次 / 状态符（✓/·）/ sparkline 字符 / tok/s / 缓存 / 时长；空态「暂无已完成轮次」；「—」值加 muted 三级灰 | client.js:2582-2599；`.jx-recent-row`（:540） |
| 进度卡 | 进度条（240ms width 过渡）+ 6 阶段点（done=绿/running=蓝）；真实完成度未采集时不伪造百分比 | `.jx-progress-card*`（:818-830）；假进度修复注释 client.js:2039 |
| 子代理 Dock | 平台态「暂无子代理调用」；字段缺省一律「未上报」——不推断、不伪造 | client.js:1895-1901,2002 |
| 交互统一 | 所有 summary 隐藏原生 marker、hover 升一级色、focus-visible 焦点环 | client.js:877-879,657 |

### 5.9 浮层与设置区

| 要素 | 规则 | 出处 |
| --- | --- | --- |
| 浮层几何 | 宽 min(920px, 100vw-96px)，高 min(574px, 100dvh-146px)；高屏升至 704px；几何/遮罩/portal 归 DSH，插件只供内容 | `.jx-modal--breath`（:484）；client.js:482-484 注释,903-904 |
| 容器查询 | 表面挂 `container-name:jingxi-surface`，断点 820/720/640/560/520/360 全部走 @container | `.jx-breath-surface`（:487）；client.js:659-660,735-736,890-897,908-909 |
| 设置区 | 版本（鲸息插件/设计基线/DSH 宿主/宿主兼容）+ 运行状态（会话投影/实时遥测/DSH 运行）+ Doctor 折叠（只读诊断、失败给真实原因） | client.js:2829-2869 |
| 备用入口 | 320px 宿主隐藏 footer 时，设置区「打开鲸息」为正式备用入口（先关设置再开浮层，避免 modal-on-modal） | client.js:2771-2773,2796-2799 |

---

## 6. 图标使用规则（依 assets/icons/manifest.json）

| 规则 | 细节 | 出处 |
| --- | --- | --- |
| 画布 | 128×128 PNG、透明底；源板留在发布包外 | manifest.json `canvas`（:7-12）、`sourcePolicy`（:13） |
| 黑鲸+蓝喷是身份不是动作图标 | brand 组（idle/active/live/efficient/smooth/perfect-breath/best-breath）只许出现在 `breath.title` 与预留 `share.reserved`；禁止当通用动作图标 | manifest.json `layers.brand`（:19-23） |
| 鲸鱼主体用官方 FishLogo | 运行时鲸鱼一律来自宿主 `@deepseek-ai/dsh-client-ui-primitives:FishLogo`，插件只在其周围加水波/喷水/信号语言；不复制不裁切鲸鱼主体 | manifest.json `layers.runtimeV15.hostComponent`（:45）；client.js:43-45,922-925,990-993 |
| 喷水三态是语义不是装饰 | spout-v15 的 idle/light/stable 对应呼吸强度状态，只许出现在 `breath.state` 与 `sidebar.entry`；active→light、stable/high→stable、其余→idle | manifest.json `layers.spoutV15`（:48-52）；RuntimeSpout client.js:1009-1017 |
| 分组 allowedSurfaces | runtimeV15 限 `sidebar.entry / panel.runtime / restart.status / update.status`；action（restart/update/settings）用内联 SVG currentColor，「no whale body, no spout, no raster Brand asset」；state 视觉不得变成 Footer 动作图标 | manifest.json `layers.*`（:24-47） |
| 动作-水语言配对 | 鲸鱼主体恰好配一种动作专属水语言：restart=单道水波、jingxi=喷水、update=三线信号 | manifest.json `layers.runtimeV15.rule`（:46）；client.js:994-1052（RuntimeWave/RuntimeSpout/RuntimeSignal） |
| 状态徽标 | success/failed 状态以 10px 角标叠于鲸鱼右下（v15/status），idle 不叠 | client.js:978-980,1049-1051；`.jx-runtime-mark__status`（:463） |
| legacy 禁令 | 旧 runtime PNG 含品牌鲸鱼图，仅作兼容引用，侧栏与生命周期控件禁用；根目录别名路径只兼容、禁止新增源码引用 | manifest.json `legacyUsage`（:292-302） |
| 状态/工具组 | status 8 枚（connecting/offline/connected/connect-failed/model-switch/token-limit/processing/paused）、utility 6 枚、breath 8 枚（点火/加速/巡航/峰值/湍流/着陆/中断/完成）按语义取用 | manifest.json `groups.status/utility/breath`（:134-249）；呼吸语言表 `README.md:74-87` |

---

## 7. 动效规范

| 动效 | 参数 | 用途 | 出处 |
| --- | --- | --- | --- |
| 150ms 过渡节奏 | `transition:background 150ms ease,color 150ms ease` | 全部 hover/颜色微交互的统一节拍（侧栏按钮、喷水 hover） | client.js:414,480-481 |
| jx-dot-breathe | 1600ms ease-in-out infinite（opacity .55→1） | 侧栏 active 状态点呼吸 | client.js:476,803 |
| 喷水脉冲 | jx-breath-pulse / jx-runtime-breath-pulse 1800ms ease-in-out infinite（scale .88→1.05 + 位移） | active 态鲸鱼喷水 | client.js:474-478 |
| 加载流动 | jx-runtime-flow 900ms ease-in-out infinite alternate（0.5px 沉浮） | runtime mark loading 装饰 | client.js:464-465 |
| 进度填充 | width 240ms ease | 进度条 | client.js:822 |
| 页面可见性 | 页面隐藏时暂停 5s 轮询与呼吸动画，恢复可见重启 | client.js:2320-2353 |

| reduced-motion 规则 | 出处 |
| --- | --- |
| `prefers-reduced-motion:reduce` 必须全覆盖：呼吸脉冲、dot 呼吸、loading 流动、spouts 过渡、进度填充过渡全部关停，喷水降级为 opacity .85 静态 | client.js:466,479,910 |

---

## 8. 空态与数据完整性规范

| 规则 | 细节 | 出处 |
| --- | --- | --- |
| 空值「—」灰调降级 | 所有格式化函数缺值返回「—」；渲染层检测 `value === '—'` 打 `data-empty`，视觉降三级灰、字重 500；最近轮次中「—」加 muted | client.js:1163-1235（fmt 系列）、2227、865、2407 |
| 「暂无」短文案 | 结构性缺失用「暂无」：暂无会话轨迹/暂无已完成轮次/暂无子代理调用/暂无轮次数据 | client.js:1760,2002,2049,2597 |
| scope 三态显式标注 | 计数口径必须标注：本轮 / 本会话累计 / 暂不可用；unavailable 时三项显示「—」而不是 0 | client.js:1072-1075 |
| 0 不是有效速度 | 缺数据时服务端可能给 0，一律按无值处理显示「等待速度数据」，绝不显示「估算 0 tok/s」 | client.js:2103-2105 |
| 速率五档诚实 | exact→实时 / estimated→估算 / historical→最近 / session→平均 / 其余→等待速度数据；无 live 才允许历史档，避免历史伪装实时 | client.js:2356-2359,2106-2119 |
| 采样不足披露话术 | 「速度采样不足：当前会话的真实采样太少，暂不绘制；点击刷新重新抓取」「本轮采样不足；下一轮产生更多采样后绘制曲线」 | client.js:2125-2126 |
| 禁止伪造轨迹 | 无真实 projection 不绘制，保持空轨道/未知状态；估算/缺失一律用可证明的通用标签；工具事件 tick 只来自真实 tool/call（非子代理），附 provenance 注记 | client.js:16,1098,1877-1882 |
| 迟到保护 | request epoch 拒绝迟到响应；会话归属以宿主返回 sessionId 为唯一依据；失败 fail-closed 不保留上一会话视图 | client.js:67-76,118-127,135-138 |
| 失败面诚实 | 更新检查失败给可操作真实原因，不伪造成功态；超时文案「刷新超时，请检查网络后重试」 | client.js:2854-2856,142 |

---

## 9. 反模式档案（本项目真实教训）

| 反模式 | 事故描述 | 教训 / 现行规则 | 出处 |
| --- | --- | --- | --- |
| 拼接事故 token | 曾出现字符串拼接产生的怪物 token `--dsw-alias-brand-primary-new-colorprimary-new-color`，宿主永不命中、静默失效 | token 名只允许完整字面量，禁止拼接生成；V1.0.3 已「事故 token 归零」，评审需全文 grep `--dsw-alias-` 校验 | `README.md:33`；现行全部字面量引用见 2.1 |
| `:has()` 特异度陷阱 | `.jx-curve-grid:has(.jx-curve-empty)` 曾因特异度高于后续普通规则导致空态样式覆盖序错乱 | 用 `:has()` 写的条件样式必须意识到其特异度 = 内部选择器之和；空态覆盖改走 `data-curve-state="empty"` 属性选择器显式表达 | client.js:579（:has 写法）；:631-632（属性选择器正解） |
| grid 自动落位 32px 轨事故 | 曲线区 `grid-template-columns:32px minmax(0,1fr)` 的 Y 轴轨在空态无 Y 轴内容时仍占 32px，把空态文案挤偏 | 有命名轨道宽的 grid，空态必须同步重置轨道（`grid-template-columns:minmax(0,1fr)`）；凡 grid 结构件都要检查「空态轨道」 | client.js:605（正常轨）；:632（空态重置） |
| 误译「取消」 | compaction（上下文压缩）曾被误译为「取消」，与 cancelled（已取消）语义相撞，用户无法区分重试/压缩/取消 | 术语表锁定：compaction=压缩、retry=重试、cancelled=已取消；事件刻度图例与 meta 文案共用同一映射源 | eventTickLabel client.js:1235；子代理状态 :1907；meta「重试 N · 压缩 N」:2372 |

---

## 附：文件-职责索引

| 文件 | 职责 |
| --- | --- |
| `lib/client.js` | 浏览器半：样式（CSS 字符串注入，`style[data-plugin="dsh-jingxi"]` 卸载即移除）、侧栏入口、呼吸浮层、设置区 |
| `lib/index.js` / `lib/telemetry-fold.js` / `lib/dsh-update.js` / `lib/asset-route.js` | host 半：fail-closed API、遥测折叠投影、只读更新检查、素材路由 |
| `assets/icons/manifest.json` | 图标体系 V1.5：分组、allowedSurfaces、legacy 禁令 |
| `README.md` | 产品叙事与版本史（V1.0.1 Pure Breath / V1.0.2 可靠修复 / V1.0.3 视觉优化） |
