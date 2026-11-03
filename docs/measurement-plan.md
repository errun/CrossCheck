# RFPAI 使用效果衡量

更新：2026-11-03。此文档配合SEO/GEO审核分支；生产事件验证须在获批上线后进行。

## 需要回答的问题

搜索或AI推荐带来的访问，有多少开始处理、有多少生成成功、是否下载结果、是否在后续日期再次成功使用？先看成功使用和复用，再看展示与点击。

| 事件 | 触发时机 | 允许的自定义参数 | 用于判断 |
| --- | --- | --- | --- |
| tool_start | 用户开始处理已选择的材料 | tool | 工具开始使用次数 |
| tool_success | 接口返回可展示的有效结果 | tool | 成功使用次数，核心指标 |
| tool_failure | 本次处理失败 | tool | 免费模型与文件处理失败率 |
| tool_download | 导出请求返回文件并触发浏览器下载 | tool、file_format | 结果下载操作；不代表已打开或审核文件 |
| tool_copy | 草稿写入剪贴板成功 | tool | 草稿复制使用 |
| tool_export_requested | 已打开PDF打印窗口，准备触发打印 | tool、file_format | 打印导出请求，不代表PDF保存成功 |
| resource_download | 点击公开案例或模板的下载链接 | resource、language | 资料下载意图，不代表保存完成或工具使用 |

`tool`仅允许scanner/matrix/writer；`file_format`仅允许csv/xlsx_gov/xlsx_enterprise/docx/pdf_print；`resource`仅允许固定公开资料编号。禁止发送文件名、正文、报价、投标人名称或原始错误内容。

所有业务事件只在rfpai.io与www.rfpai.io发送；本地和预览不发送。统计调用失败不能影响生成、复制或下载。自动测试验证此约束。

## 查看方法

1. 用Search Console查看查询词、落地页、展示、点击与点击率；不同聚合维度的展示不能直接相加作为总量。
2. GA4按自然搜索、可识别的AI引荐来源及其他来源分组，查看落地页→tool_start→tool_success→tool_download。不要把模板下载算成工具生成成功。
3. 7日复用率：首次成功使用后的第1至7天内，在另一日期再次触发tool_success的用户数，除以首次成功已满7天的用户数。使用同一分析时区并留足观察窗口。
4. 同时看成功使用总数、成功用户数、每位成功用户的使用次数、失败率。初期流量少时，先比较绝对人数，避免过度解释单日百分比变化。

GA4基于现有浏览器标识衡量用户，清除标识和跨设备使用可能被分开计数。部分AI应用不提供引荐来源，不能把所有“直接访问”认定为AI流量。不新增跟踪身份或上传用户文档来补齐这些缺口。

## 获批上线后的验收

- 用公开虚构材料验证GA4实时事件及参数；生产验收结果与预览测试结果分开记录。
- 视需要在GA4登记tool、file_format、resource、language等自定义维度，并将tool_success作为关键使用事件。当前连接为只读，本分支未修改GA4管理配置。
- 重新提交站点地图并检查主要页面的Google所选规范网址；记录上线日期后再观察收录、点击与成功使用变化。
- 本分支不承诺搜索排名、AI引用或流量增长；相关效果必须在上线及实际观察后判断。

## 行为过程补齐（待审核分支）

三种工具各自记录：view、file_selected、file_rejected、consent、start、wait、success、failure、export_start、export_failure、download、copy/copy_failure、export_requested、result_edit、exit。只有有意义的步骤触发事件，不记录每次键盘输入。

- 保留既有`tool_success`作为成功次数口径。`rfpai_{scanner|matrix|writer}_{step}`用于按工具分析漏斗，不能与`tool_success`相加。工具专属事件名可直接用GA4标准eventName维度查询，不依赖新增自定义维度。
- 参数限定为工具、界面语言、PDF/docx/其他、文件大小区间、操作阶段、固定失败类别、等待区间、编辑字段及耗时。禁止文件名、文档正文、用户输入、原始异常、报价、投标人和持久用户身份。
- 等待事件在15/30/60/120秒各最多一次，只有前台可见时发送。耗时是本次处理的墙钟耗时，不是前台活跃时间。exit仅表示观察到页面离开，不能直接称为放弃或取消；客户端退出事件也可能漏报。卸载后返回的结果不计为已展示成功。
- API在响应头给出解析和生成耗时，结构化运行日志区分document/generation阶段及安全失败码。单次随机attempt_id仅用于客户端请求与运行日志关联，不上报GA4或Clarity，不用作用户身份。日志保存期取决于现有托管方案，未新增付费存储。
- `?qa=1`把该标签页标为测试，`?qa=0`清除；test_mode参数为qa/live，Clarity有对应固定标签。未建立测试标记前的历史QA不能自动洗成自然用户数据。
- GA与Clarity脚本只在rfpai.io和www.rfpai.io加载，预览和本地不加载。脚本被拦截、离线或浏览器标识变化时仍可能丢失，不能承诺100%用户行为覆盖或跨设备识别。
- 默认页面内容用data-clarity-mask遮蔽；仅固定公开资料、说明与操作按钮明确放开。文档内容、文件名、输出及错误区不放开。Clarity事件只包含固定步骤，既有平衡遮蔽设置不等于全部文档文字都已遮蔽；新代码上线后需用虚构材料验证新录制。

### GA4需要登记的字段（尚未修改账户）

只读metadata核验当前没有自定义维度或指标。为支持报表，拟登记事件维度：tool、ui_language、test_mode、reason_code、failure_stage、wait_bucket、input_format、size_bucket、edit_field、file_format、phase、resource；数值指标：elapsed_ms、parse_ms、generation_ms、export_ms，单位毫秒。将tool_success设为关键事件。上线及账户管理修改须按项目授权执行，登记后需等待平台处理，不能补回历史缺失数据。

验收分三层：自动测试与真实本地处理；受保护预览与下载；获批上线后，在qa标记下核实GA4实时事件和Clarity新录制遮蔽。只通过前两层不能声称第三层已完成。
