import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

@Injectable()
export class AiService {
  constructor(private readonly config: ConfigService) {}

  async chat(messages: Message[]): Promise<string> {
    const apiKey = this.config.get<string>('ANTHROPIC_API_KEY');
    if (!apiKey) {
      throw new BadRequestException('AI-ассистент не настроен. Обратитесь к администратору.');
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: `Ты помощник-ассистент для сотрудников АФМ (Агентство по финансовому мониторингу Казахстана).
Отвечай только на русском языке, кратко и по делу.
Помогай сотрудникам с вопросами об обучении, финансовом мониторинге, комплаенс-процедурах, ПОД/ФТ (противодействие отмыванию денег и финансированию терроризма).
Если вопрос не связан с работой или обучением — вежливо откажись отвечать.
Не раскрывай технические детали системы.`,
        messages,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Anthropic API error:', err);
      throw new BadRequestException('Ошибка AI-сервиса. Попробуйте позже.');
    }

    const data = (await response.json()) as any;
    return data.content?.[0]?.text ?? '';
  }
}
