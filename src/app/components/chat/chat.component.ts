import { Component, OnInit } from '@angular/core';
import { QueryService } from '../../services/query.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss'],
})
export class ChatComponent implements OnInit{
  userInput: string = '';
  messages: { role: string; text: string; images: string[] }[] = [];
  loading: boolean = false;

  constructor(private queryService: QueryService) {}

  ngOnInit(): void {
    const storedMessages = localStorage.getItem('chatHistory');
    if (storedMessages) {
      this.messages = JSON.parse(storedMessages);
    }
  }


  // async askQuestion() {
  //   if (!this.userInput.trim()) return;

  //   this.loading = true;
  //   this.messages.push({ role: 'user', text: this.userInput, images: [] });

  //   try {
  //     const response = await this.queryService.askQuestion(this.userInput);
  //     this.messages.push({ role: 'ai', text: response.text, images: response.images || [] });

  //     // Store only the last 10 messages
  //     if (this.messages.length > 10) {
  //       this.messages = this.messages.slice(this.messages.length - 10);
  //     }
  //     localStorage.setItem('chatHistory', JSON.stringify(this.messages));
  //   } catch (error) {
  //     console.error('Error fetching response:', error);
  //     this.messages.push({ role: 'ai', text: "Something went wrong. Please try again.", images: [] });
  //   } finally {
  //     this.loading = false;
  //   }

  //   this.userInput = '';
  // }

  async askQuestion() {
    if (!this.userInput.trim()) return;
  
    this.loading = true;
    this.messages.push({ role: 'user', text: this.userInput, images: [] });
  
    try {
      // Send last 5 messages as context
      const contextMessages = this.messages.slice(-5);  
  
      const response = await this.queryService.askQuestion(this.userInput, contextMessages);
      this.messages.push({ role: 'ai', text: response.text, images: response.images || [] });
  
      // Store last 10 messages
      if (this.messages.length > 10) {
        this.messages = this.messages.slice(this.messages.length - 10);
      }
      localStorage.setItem('chatHistory', JSON.stringify(this.messages));
    } catch (error) {
      console.error('Error fetching response:', error);
      this.messages.push({ role: 'ai', text: "Something went wrong. Please try again.", images: [] });
    } finally {
      this.loading = false;
    }
  
    this.userInput = '';
  }
  
  cancelRequest() {
    this.queryService.cancelRequest();
    this.loading = false;
    this.messages.push({ role: 'ai', text: "Request canceled.", images: [] });
    
    localStorage.setItem('chatHistory', JSON.stringify(this.messages));
  }

  clearChat() {
    this.messages = [];
    localStorage.removeItem('chatHistory');
  }  
}
