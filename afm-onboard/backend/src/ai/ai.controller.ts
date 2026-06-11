import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Throttle } from '@nestjs/throttler';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(private readonly ai: AiService) {}

  @Post('chat')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async chat(@Body() body: { messages: ChatMessage[] }) {
    const messages = (body.messages ?? []).slice(-10); // keep last 10 turns
    const reply = await this.ai.chat(messages);
    return { reply };
  }
}
