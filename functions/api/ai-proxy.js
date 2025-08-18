/**
 * Cloudflare Pages Function作为AI API的安全代理
 * 它会自动部署在 your-site.com/api/ai-proxy
 */
export async function onRequest(context) {
    // context 对象包含了请求、环境变量等所有信息
    const { request, env } = context;

    // 1. 安全设置：只接受POST请求
    if (request.method !== 'POST') {
        return new Response('Expected POST', { status: 405 });
    }

    try {
        // 2. 从前端请求中获取图片数据
        const { images } = await request.json();
        if (!images || !Array.isArray(images) || images.length === 0) {
            return new Response(JSON.stringify({ error: 'Image data is missing' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // 3. 构建发送给真实AI API的Prompt和数据结构
        const aiPrompt = `你是一个专业的汽车行业分析师，你的任务是根据用户提供的汽车图片（可能是外观、内饰、细节图等），生成一份专业的分析报告。请严格按照以下 JSON 结构返回你的分析结果，不要添加任何额外的解释或说明文字，只返回一个完整的 JSON 对象。如果图片内容不足以填充某个字段，请根据你的知识库进行合理推断或留空。这是你要填充的 JSON 模板: ${JSON.stringify(generateAITemplateForPrompt(), null, 2)}`;

        const content = [{ type: 'text', text: aiPrompt }];
        images.forEach(base64Image => {
            content.push({
                type: 'image_url',
                image_url: { url: `data:image/jpeg;base64,${base64Image}` },
            });
        });

        const dataForAI = {
            "model": "323", // 替换为你的 endpoint_id
            "temperature": 0.7,
            "max_tokens": 4096,
            "messages": [{ "role": "user", "content": content }],
            "stream": false,
        };

        // 4. 安全地调用公司API
        // env.AI_API_KEY 是我们在Cloudflare Pages设置中配置的秘密变量
        const response = await fetch("http://ai.sda.changan.com.cn/api/v1/chat/completions", {
            method: 'POST',
            headers: {
                'Authorization': env.AI_API_KEY, // 从环境变量安全地获取 API Key
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(dataForAI),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`AI API request failed with status ${response.status}: ${errorText}`);
        }

        // 5. 将AI的响应直接返回给前端
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

// 这个辅助函数和Worker版本中完全一样
function generateAITemplateForPrompt() {
    return {
        template_schema_version: "1.0",
        reportTitle: "【请填写报告主标题】",
        coverImageUrl: "【请粘贴封面图片的URL，或留空】",
        blocks: [
            { type: "large", title: "【大卡片标题】", content: ["【段落1】"], images: ["【图片URL】"] },
            { type: "divider", content: "【章节标题】" },
            { type: "small", title: "【小卡片标题】", content: ["【简介】"] }
        ]
    };
}