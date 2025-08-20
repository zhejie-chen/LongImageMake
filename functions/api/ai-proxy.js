/**
 * Cloudflare Pages Function作为AI API的安全代理
 * [MODIFIED] 终极增强版，包含详细的布局与结构指南。
 */
export async function onRequest(context) {
    const { request, env } = context;

    if (request.method !== 'POST') {
        return new Response('Expected POST', { status: 405 });
    }

    try {
        const { prompt } = await request.json();
        if (!prompt) {
            return new Response(JSON.stringify({ error: 'Prompt data is missing' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // --- NEW: 包含布局逻辑的最终版系统指令 ---
        const systemPrompt = `你是一位顶级的汽车行业分析师和视觉设计师。你的任务是根据用户提供的文字内容（可能包含从图片OCR识别的文字），生成一份结构清晰、信息准确、且视觉上吸引人的专业分析报告。

请严格按照以下 JSON 结构和指南返回结果，不要添加任何额外的解释或说明文字，只返回一个完整的 JSON 对象。

【布局与结构指南】
这是生成高质量长图的关键，请严格遵守：

1.  **大标题 (\`divider\`)**:
    * **作为全文总标题**: 当它是第一个模块时，用于整个长图的标题，样式应设为 \`"align": "center"\` 和 \`"color": "black"\`。
    * **作为章节标题**: 在长图中间用于分隔不同板块时，样式使用默认的 \`"align": "center"\` 和 \`"color": "default"\` (灰色)。

2.  **中标题 (\`mediumtext\`)**:
    * 用于展示较长的、引人注目的宣传语或小节标题，但字数不宜过多，核心作用是醒目提示。

3.  **小标题 (\`puretext\`)**:
    * 用于展示字数极少的亮点功能或关键参数（如“800V高压平台”）。内容可以与卡片内的正文重复，以达到强调效果。

4.  **大卡片 (\`large\`)**:
    * 是内容的核心载体。如果某个章节的正文内容过长，应主动将其拆分为【多个内容连贯的大卡片】，并把它们都放在同一个大标题 (\`divider\`) 之下。

5.  **小卡片 (\`small\`) 与 小标题 (\`puretext\`) 的布局规则**:
    * 这两种类型用于展示并列的、简短的信息点。
    * 它们应该**成对或以偶数数量出现** (例如, 2个或4个), 并且**内容相关度高的应该相邻放置**。例如，可以并排放置两个介绍亮点功能的小卡片，或者并排放置两个展示核心参数的小标题。

【高级样式指南】
请克制地、有策略地使用以下样式，以保持报告的专业和整洁感：

* **卡片样式**: \`"titleBarColor"\` (可选: "blue", "purple", "orange") 和 \`"backgroundColor"\` (可选: "blue", "purple", "orange", "default")。
* **文本样式**: 在 "content" 字段内使用 \`<strong>加粗</strong>\` 和 \`<mark style="background-color: #fde047;">高亮</mark>\` (可选颜色: #fde047黄, #bfdbfe蓝, #bbf7d0绿, #e9d5ff紫)。
* **标题样式**: \`"align"\`, \`"color"\`, \`"fontSize"\`, \`"textColor"\` 等，根据不同标题类型使用。

【JSON 输出模板】
这是你要填充的 JSON 模板，其中已包含样式字段作为示例:
${JSON.stringify(generateAITemplateForPrompt(), null, 2)}`;


        const dataForAI = {
            // !!! 重要: 请将 "your_endpoint_id" 替换为您的新文本模型的真实 endpoint_id !!!
            "model": "321",
            "temperature": 0.7,
            "max_tokens": 8192, // 增加token以应对更复杂的指令和输出
            "messages": [
                { "role": "system", "content": systemPrompt },
                { "role": "user", "content": prompt }
            ],
            "stream": false,
        };

        const response = await fetch("http://ai.sda.changan.com.cn/api/v1/chat/completions", {
            method: 'POST',
            headers: {
                'Authorization': env.AI_API_KEY,
                // 'Authorization': "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyMDIyMTE2NTUiLCJleHAiOjE3NjMwMjA1MTd9.GrJcCdIJgncufzqdX45QsmwdDNo1XFwDexAW-YhzIho",
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(dataForAI),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`AI API request failed with status ${response.status}: ${errorText}`);
        }

        const aiResponseData = await response.json();
        let jsonString = aiResponseData.choices[0].message.content;

        const jsonMatch = jsonString.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch && jsonMatch[1]) {
            jsonString = jsonMatch[1];
        }

        return new Response(jsonString, {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error('Error in Pages Function:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}

// 更新了模板以更好地引导AI遵循布局规则
function generateAITemplateForPrompt() {
    return {
        template_schema_version: "1.0",
        reportTitle: "【请填写报告主标题】",
        coverImageUrl: "【请粘贴封面图片的URL，或留空】",
        blocks: [
            {
                type: "divider",
                content: "【全文总标题】",
                "align": "center",
                "color": "black"
            },
            {
                type: "large",
                title: "【第一个核心板块标题】",
                "titleBarColor": "blue",
                content: ["【内容段落1...】"],
            },
            {
                type: "divider",
                content: "【第二个章节标题】",
                "align": "center",
                "color": "default"
            },
            {
                type: "small",
                title: "【并列内容1】",
                "titleBarColor": "purple",
                content: ["【简介1】"]
            },
            {
                type: "small",
                title: "【并列内容2】",
                "titleBarColor": "purple",
                content: ["【简介2】"]
            }
        ]
    };
}