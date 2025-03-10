import { Component, ElementRef, OnInit, ViewChild, AfterViewInit, HostListener, ChangeDetectorRef } from '@angular/core';
import { QueryService } from '../../services/query.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MarkdownModule } from 'ngx-markdown';
import { debounceTime, Subject } from 'rxjs';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [FormsModule, CommonModule, MarkdownModule],
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss'],
})
export class ChatComponent implements OnInit, AfterViewInit {
  @ViewChild('chatContainer') chatContainer!: ElementRef;
  userInput: string = '';
  messages: Message[] = [];
  loading: boolean = false;
  backendUrl = 'http://localhost:8000';
  isLoading: boolean = false;
  loadingText = "OrchestrAI is thinking";
  private loadingDots = ["OrchestrAI is thinking.", "OrchestrAI is thinking..", "OrchestrAI is thinking..."];
  private dotIndex = 0;
  private loadingInterval: any;
  private particles: { x: number, y: number, vx: number, vy: number, size: number }[] = [];
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D | null;
  private mouse = { x: -100, y: -100 };
  private chunkSubject = new Subject<string>();

  constructor(private queryService: QueryService, private cdr: ChangeDetectorRef) {
    this.chunkSubject.pipe(debounceTime(50)).subscribe(() => {
      this.cdr.detectChanges();
      this.scrollToBottom();
    });
  }

  ngOnInit(): void {
    const storedMessages = localStorage.getItem('chatHistory');
    if (storedMessages) {
      this.messages = JSON.parse(storedMessages);
    }
  }

  ngAfterViewInit() {
    this.canvas = document.getElementById('particleCanvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d');
    this.resizeCanvas();
    this.initParticles();
    requestAnimationFrame(() => this.animateParticles());
  }

  startLoadingAnimation() {
    this.isLoading = true;
    this.loadingInterval = setInterval(() => {
      this.loadingText = this.loadingDots[this.dotIndex];
      this.dotIndex = (this.dotIndex + 1) % this.loadingDots.length;
    }, 500);
  }

  stopLoadingAnimation() {
    this.loadingText = "Here is my response...";
    this.isLoading = false;
    clearInterval(this.loadingInterval);
  }

  async askQuestion() {
    if (!this.userInput.trim()) return;

    this.loading = true;
    this.scrollToBottom();
    this.messages.push({ role: 'user', text: this.userInput, images: [], sources: [], timestamp: new Date() });

    try {
      const contextMessages = this.messages.slice(-5);
      this.startLoadingAnimation();
      const response = await this.queryService.askQuestionStream(this.userInput, contextMessages);

      let aiMessage: Message = {
        role: 'ai',
        text: '',
        images: [],
        sources: [],
        timestamp: new Date(),
      };

      this.messages.push(aiMessage);

      let fullResponse = '';
      for await (const chunk of response.data) {
        fullResponse += chunk;
      }

      const parsedResponse = JSON.parse(fullResponse);

      let bufferedChunk = '';
      for (const char of parsedResponse.text) {
        bufferedChunk += char;
        if (bufferedChunk.length > 5 || char.includes('\n')) {
          aiMessage.text += bufferedChunk;
          this.chunkSubject.next(bufferedChunk);
          bufferedChunk = '';
          await this.simulateTypingDelay(char);
        }
      }
      if (bufferedChunk) {
        aiMessage.text += bufferedChunk;
        this.chunkSubject.next(bufferedChunk);
      }

      const formattedSources =
        parsedResponse.source_info?.map((source: { pdf: string; page: number; link: string }) => ({
          ...source,
          link: `${this.backendUrl}/pdf/${source.pdf}#page=${source.page + 1}`,
        })) || [];

      aiMessage.sources = formattedSources || [];
      aiMessage.images = parsedResponse.images || [];

      this.stopLoadingAnimation();
      setTimeout(() => this.scrollToBottom(), 100);

      if (this.messages.length > 10) {
        this.messages = this.messages.slice(this.messages.length - 10);
      }
      localStorage.setItem('chatHistory', JSON.stringify(this.messages));
    } catch (error) {
      console.error('Error fetching response:', error);
      this.messages.push({ role: 'ai', text: 'Something went wrong. Please try again.', images: [], sources: [], timestamp: new Date() });
    } finally {
      this.loading = false;
    }

    this.userInput = '';
  }

  cancelRequest() {
    this.queryService.cancelRequest();
    this.loading = false;
    this.messages.push({ role: 'ai', text: 'Request canceled.', images: [], sources: [], timestamp: new Date() });

    localStorage.setItem('chatHistory', JSON.stringify(this.messages));
  }

  clearChat() {
    this.messages = [];
    localStorage.removeItem('chatHistory');
  }

  scrollToBottom() {
    setTimeout(() => {
      if (this.chatContainer) {
        this.chatContainer.nativeElement.scrollTop = this.chatContainer.nativeElement.scrollHeight;
      }
    }, 100);
  }

  @HostListener('window:resize')
  resizeCanvas() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  private initParticles() {
    for (let i = 0; i < 70; i++) {
      this.particles.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        vx: (Math.random() - 0.5) * 1.5,
        vy: (Math.random() - 0.5) * 1.5,
        size: Math.random() * 3 + 1,
      });
    }
  }

  private animateParticles() {
    if (!this.ctx) return;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (let particle of this.particles) {
      const dx = particle.x - this.mouse.x;
      const dy = particle.y - this.mouse.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < 100) {
        particle.vx += dx * 0.005;
        particle.vy += dy * 0.005;
      }

      particle.x += particle.vx;
      particle.y += particle.vy;

      if (particle.x <= 0 || particle.x >= this.canvas.width) particle.vx *= -1;
      if (particle.y <= 0 || particle.y >= this.canvas.height) particle.vy *= -1;

      this.ctx.beginPath();
      this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      this.ctx.fillStyle = "white";
      this.ctx.fill();
    }

    requestAnimationFrame(() => this.animateParticles());
  }

  private async simulateTypingDelay(char: string) {
    const delay = char.includes('.') || char.includes('?') || char.includes('!') ? 100 : 30;
    return new Promise(resolve => setTimeout(resolve, delay));
  }
}

export interface Message {
  role: string;
  text: string;
  images: string[];
  sources: sources[];
  timestamp: Date;
}

export interface sources {
  pdf: string;
  page: number;
  link: string;
}