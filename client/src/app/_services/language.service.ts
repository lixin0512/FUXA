import { Injectable } from '@angular/core';
import { ProjectService } from './project.service';
import { Language, LANGUAGE_TEXT_KEY_PREFIX, Languages, LanguageText } from '../_models/language';
import { BehaviorSubject } from 'rxjs';
import { first } from 'rxjs/operators';
import { UserInfo } from '../users/user-edit/user-edit.component';
import { AuthService } from './auth.service';
import { IndexedDBService } from './indexeddb.service';

@Injectable({
    providedIn: 'root'
})
export class LanguageService {
    localStorageItem = 'currentLanguage';
    languages: Languages;
    languageConfig: LanguageConfiguration;
    languageConfig$ = new BehaviorSubject<LanguageConfiguration>(null);
    texts: { [id: string]: LanguageText } = {};

    constructor(
        public projectService: ProjectService,
        private authService: AuthService,
        private indexedDB: IndexedDBService
    ) {
        this.projectService.onLoadHmi.subscribe(() => {
            this.getStorageLanguage().then(storageLanguage => {
                this.languages = this.projectService.getLanguages();
                this.languageConfig = {
                    currentLanguage: storageLanguage || this.languages?.default || { id: 'zh-cn', name: '中文' },
                    ...this.languages
                };
                const user = this.authService.getUser();
                const userLanguageId = new UserInfo(user?.info).languageId;
                if (userLanguageId) {
                    this.languageConfig.currentLanguage ??= this.getLanguage(userLanguageId);
                }
                this.setCurrentLanguage(this.languageConfig.currentLanguage);
                this.texts = this.projectService.getTexts().reduce((acc, text) => {
                    acc[text.name] = text;
                    return acc;
                  }, {} as { [id: string]: LanguageText });
            });
        });
    }

    setCurrentLanguage(lang: Language): void {
        const username = this.authService.getUser()?.username || '';
        this.languageConfig.currentLanguage = lang;
        this.languageConfig$.next(this.languageConfig);
        const key = `${this.localStorageItem}-${username}`;
        this.indexedDB.setItem(key, lang).subscribe({
            next: () => {},
            error: (err) => console.error('保存语言设置失败:', err)
        });
    }

    private async getStorageLanguage(): Promise<Language> {
        const username = this.authService.getUser()?.username || '';
        const key = `${this.localStorageItem}-${username}`;
        try {
            return await this.indexedDB.getItemSync(key);
        } catch (err) {
            console.error('获取语言设置失败:', err);
            return null;
        }
    }

    getTranslation(textKey: string): string {
        if (!textKey || !textKey.startsWith(LANGUAGE_TEXT_KEY_PREFIX)) {
            return null;
        }
        const text = this.texts[textKey.substring(1)];
        if (text) {
            if (text.translations[this.languageConfig.currentLanguage.id]) {
                return text.translations[this.languageConfig.currentLanguage.id];
            } else {
                return text.value;
            }
        }
        return null;
    }

    getLanguage(id: string) {
        if (this.languages?.default?.id === id) {
            return this.languages.default;
        }
        return this.languages?.options?.find(lang => lang.id === id);
    }
}

export interface LanguageConfiguration extends Languages {
    currentLanguage: Language;
}
