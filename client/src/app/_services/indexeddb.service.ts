import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { switchMap } from 'rxjs/operators';

/**
 * IndexedDB 封装服务
 * 提供增删改查方法，用于替代 localStorage
 */
@Injectable({
    providedIn: 'root'
})
export class IndexedDBService {
    private dbName = 'FUXA_DB';
    private dbVersion = 1;
    private storeName = 'keyValueStore';
    private db: IDBDatabase;

    constructor() {
        this.initDB();
    }

    /**
     * 初始化 IndexedDB
     */
    private async initDB(): Promise<void> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => {
                console.error('IndexedDB 打开失败:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };

            request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
                const db = (event.target as IDBOpenDBRequest).result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    // 创建对象存储，key 为字符串
                    db.createObjectStore(this.storeName, { keyPath: 'key' });
                }
            };
        });
    }

    /**
     * 确保数据库已初始化
     */
    private async ensureDB(): Promise<IDBDatabase> {
        if (this.db) {
            return Promise.resolve(this.db);
        }
        await this.initDB();
        return this.db;
    }

    /**
     * 设置/更新数据
     * @param key 键名
     * @param value 值（可以是任何可序列化的对象）
     * @returns Observable<boolean>
     */
    setItem(key: string, value: any): Observable<boolean> {
        return from(
            this.ensureDB().then(db => {
                return new Promise<boolean>((resolve, reject) => {
                    const transaction = db.transaction([this.storeName], 'readwrite');
                    const store = transaction.objectStore(this.storeName);
                    const item = {
                        key: key,
                        value: typeof value === 'string' ? value : JSON.stringify(value),
                        timestamp: Date.now()
                    };
                    const request = store.put(item);

                    request.onsuccess = () => {
                        resolve(true);
                    };

                    request.onerror = () => {
                        console.error('IndexedDB 写入失败:', request.error);
                        reject(request.error);
                    };
                });
            })
        );
    }

    /**
     * 获取数据
     * @param key 键名
     * @returns Observable<any> 返回解析后的值，如果不存在则返回 null
     */
    getItem(key: string): Observable<any> {
        return from(
            this.ensureDB().then(db => {
                return new Promise<any>((resolve, reject) => {
                    const transaction = db.transaction([this.storeName], 'readonly');
                    const store = transaction.objectStore(this.storeName);
                    const request = store.get(key);

                    request.onsuccess = () => {
                        const result = request.result;
                        if (result) {
                            try {
                                // 尝试解析 JSON，如果失败则返回原始字符串
                                const parsed = JSON.parse(result.value);
                                resolve(parsed);
                            } catch (e) {
                                // 如果不是 JSON，直接返回字符串
                                resolve(result.value);
                            }
                        } else {
                            resolve(null);
                        }
                    };

                    request.onerror = () => {
                        console.error('IndexedDB 读取失败:', request.error);
                        reject(request.error);
                    };
                });
            })
        );
    }

    /**
     * 删除数据
     * @param key 键名
     * @returns Observable<boolean>
     */
    removeItem(key: string): Observable<boolean> {
        return from(
            this.ensureDB().then(db => {
                return new Promise<boolean>((resolve, reject) => {
                    const transaction = db.transaction([this.storeName], 'readwrite');
                    const store = transaction.objectStore(this.storeName);
                    const request = store.delete(key);

                    request.onsuccess = () => {
                        resolve(true);
                    };

                    request.onerror = () => {
                        console.error('IndexedDB 删除失败:', request.error);
                        reject(request.error);
                    };
                });
            })
        );
    }

    /**
     * 清空所有数据
     * @returns Observable<boolean>
     */
    clear(): Observable<boolean> {
        return from(
            this.ensureDB().then(db => {
                return new Promise<boolean>((resolve, reject) => {
                    const transaction = db.transaction([this.storeName], 'readwrite');
                    const store = transaction.objectStore(this.storeName);
                    const request = store.clear();

                    request.onsuccess = () => {
                        resolve(true);
                    };

                    request.onerror = () => {
                        console.error('IndexedDB 清空失败:', request.error);
                        reject(request.error);
                    };
                });
            })
        );
    }

    /**
     * 获取所有键名
     * @returns Observable<string[]>
     */
    getAllKeys(): Observable<string[]> {
        return from(
            this.ensureDB().then(db => {
                return new Promise<string[]>((resolve, reject) => {
                    const transaction = db.transaction([this.storeName], 'readonly');
                    const store = transaction.objectStore(this.storeName);
                    const request = store.getAllKeys();

                    request.onsuccess = () => {
                        resolve(request.result as string[]);
                    };

                    request.onerror = () => {
                        console.error('IndexedDB 获取所有键失败:', request.error);
                        reject(request.error);
                    };
                });
            })
        );
    }

    /**
     * 检查键是否存在
     * @param key 键名
     * @returns Observable<boolean>
     */
    hasItem(key: string): Observable<boolean> {
        return from(
            this.ensureDB().then(db => {
                return new Promise<boolean>((resolve, reject) => {
                    const transaction = db.transaction([this.storeName], 'readonly');
                    const store = transaction.objectStore(this.storeName);
                    const request = store.count(IDBKeyRange.only(key));

                    request.onsuccess = () => {
                        resolve(request.result > 0);
                    };

                    request.onerror = () => {
                        console.error('IndexedDB 检查键失败:', request.error);
                        reject(request.error);
                    };
                });
            })
        );
    }

    /**
     * 同步方法：设置数据（用于需要同步的场景）
     * @param key 键名
     * @param value 值
     */
    async setItemSync(key: string, value: any): Promise<boolean> {
        const db = await this.ensureDB();
        return new Promise<boolean>((resolve, reject) => {
            const transaction = db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const item = {
                key: key,
                value: typeof value === 'string' ? value : JSON.stringify(value),
                timestamp: Date.now()
            };
            const request = store.put(item);

            request.onsuccess = () => {
                resolve(true);
            };

            request.onerror = () => {
                console.error('IndexedDB 写入失败:', request.error);
                reject(request.error);
            };
        });
    }

    /**
     * 同步方法：获取数据（用于需要同步的场景）
     * @param key 键名
     */
    async getItemSync(key: string): Promise<any> {
        const db = await this.ensureDB();
        return new Promise<any>((resolve, reject) => {
            const transaction = db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const request = store.get(key);

            request.onsuccess = () => {
                const result = request.result;
                if (result) {
                    try {
                        const parsed = JSON.parse(result.value);
                        resolve(parsed);
                    } catch (e) {
                        resolve(result.value);
                    }
                } else {
                    resolve(null);
                }
            };

            request.onerror = () => {
                console.error('IndexedDB 读取失败:', request.error);
                reject(request.error);
            };
        });
    }

    /**
     * 同步方法：删除数据（用于需要同步的场景）
     * @param key 键名
     */
    async removeItemSync(key: string): Promise<boolean> {
        const db = await this.ensureDB();
        return new Promise<boolean>((resolve, reject) => {
            const transaction = db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.delete(key);

            request.onsuccess = () => {
                resolve(true);
            };

            request.onerror = () => {
                console.error('IndexedDB 删除失败:', request.error);
                reject(request.error);
            };
        });
    }

    /**
     * 批量设置数据
     * @param items 键值对数组
     * @returns Observable<boolean>
     */
    setItems(items: Array<{ key: string; value: any }>): Observable<boolean> {
        return from(
            this.ensureDB().then(db => {
                return new Promise<boolean>((resolve, reject) => {
                    const transaction = db.transaction([this.storeName], 'readwrite');
                    const store = transaction.objectStore(this.storeName);
                    let completed = 0;
                    let hasError = false;

                    if (items.length === 0) {
                        resolve(true);
                        return;
                    }

                    items.forEach(item => {
                        const dbItem = {
                            key: item.key,
                            value: typeof item.value === 'string' ? item.value : JSON.stringify(item.value),
                            timestamp: Date.now()
                        };
                        const request = store.put(dbItem);

                        request.onsuccess = () => {
                            completed++;
                            if (completed === items.length && !hasError) {
                                resolve(true);
                            }
                        };

                        request.onerror = () => {
                            if (!hasError) {
                                hasError = true;
                                console.error('IndexedDB 批量写入失败:', request.error);
                                reject(request.error);
                            }
                        };
                    });
                });
            })
        );
    }

    /**
     * 批量获取数据
     * @param keys 键名数组
     * @returns Observable<Map<string, any>>
     */
    getItems(keys: string[]): Observable<Map<string, any>> {
        return from(
            this.ensureDB().then(db => {
                return new Promise<Map<string, any>>((resolve, reject) => {
                    const transaction = db.transaction([this.storeName], 'readonly');
                    const store = transaction.objectStore(this.storeName);
                    const result = new Map<string, any>();
                    let completed = 0;
                    let hasError = false;

                    if (keys.length === 0) {
                        resolve(result);
                        return;
                    }

                    keys.forEach(key => {
                        const request = store.get(key);

                        request.onsuccess = () => {
                            const item = request.result;
                            if (item) {
                                try {
                                    const parsed = JSON.parse(item.value);
                                    result.set(key, parsed);
                                } catch (e) {
                                    result.set(key, item.value);
                                }
                            }
                            completed++;
                            if (completed === keys.length && !hasError) {
                                resolve(result);
                            }
                        };

                        request.onerror = () => {
                            if (!hasError) {
                                hasError = true;
                                console.error('IndexedDB 批量读取失败:', request.error);
                                reject(request.error);
                            }
                        };
                    });
                });
            })
        );
    }

    /**
     * 批量删除数据
     * @param keys 键名数组
     * @returns Observable<boolean>
     */
    removeItems(keys: string[]): Observable<boolean> {
        return from(
            this.ensureDB().then(db => {
                return new Promise<boolean>((resolve, reject) => {
                    const transaction = db.transaction([this.storeName], 'readwrite');
                    const store = transaction.objectStore(this.storeName);
                    let completed = 0;
                    let hasError = false;

                    if (keys.length === 0) {
                        resolve(true);
                        return;
                    }

                    keys.forEach(key => {
                        const request = store.delete(key);

                        request.onsuccess = () => {
                            completed++;
                            if (completed === keys.length && !hasError) {
                                resolve(true);
                            }
                        };

                        request.onerror = () => {
                            if (!hasError) {
                                hasError = true;
                                console.error('IndexedDB 批量删除失败:', request.error);
                                reject(request.error);
                            }
                        };
                    });
                });
            })
        );
    }

    /**
     * 获取所有数据
     * @returns Observable<Map<string, any>>
     */
    getAllItems(): Observable<Map<string, any>> {
        return from(
            this.ensureDB().then(db => {
                return new Promise<Map<string, any>>((resolve, reject) => {
                    const transaction = db.transaction([this.storeName], 'readonly');
                    const store = transaction.objectStore(this.storeName);
                    const request = store.getAll();
                    const result = new Map<string, any>();

                    request.onsuccess = () => {
                        request.result.forEach((item: any) => {
                            try {
                                const parsed = JSON.parse(item.value);
                                result.set(item.key, parsed);
                            } catch (e) {
                                result.set(item.key, item.value);
                            }
                        });
                        resolve(result);
                    };

                    request.onerror = () => {
                        console.error('IndexedDB 获取所有数据失败:', request.error);
                        reject(request.error);
                    };
                });
            })
        );
    }

    /**
     * 获取数据数量
     * @returns Observable<number>
     */
    getCount(): Observable<number> {
        return from(
            this.ensureDB().then(db => {
                return new Promise<number>((resolve, reject) => {
                    const transaction = db.transaction([this.storeName], 'readonly');
                    const store = transaction.objectStore(this.storeName);
                    const request = store.count();

                    request.onsuccess = () => {
                        resolve(request.result);
                    };

                    request.onerror = () => {
                        console.error('IndexedDB 获取数量失败:', request.error);
                        reject(request.error);
                    };
                });
            })
        );
    }

    /**
     * 根据前缀获取所有匹配的键
     * @param prefix 键前缀
     * @returns Observable<string[]>
     */
    getKeysByPrefix(prefix: string): Observable<string[]> {
        return from(
            this.ensureDB().then(db => {
                return new Promise<string[]>((resolve, reject) => {
                    const transaction = db.transaction([this.storeName], 'readonly');
                    const store = transaction.objectStore(this.storeName);
                    const request = store.getAllKeys();
                    const result: string[] = [];

                    request.onsuccess = () => {
                        const keys = request.result as string[];
                        keys.forEach(key => {
                            if (key.startsWith(prefix)) {
                                result.push(key);
                            }
                        });
                        resolve(result);
                    };

                    request.onerror = () => {
                        console.error('IndexedDB 根据前缀获取键失败:', request.error);
                        reject(request.error);
                    };
                });
            })
        );
    }

    /**
     * 根据前缀删除所有匹配的数据
     * @param prefix 键前缀
     * @returns Observable<boolean>
     */
    removeItemsByPrefix(prefix: string): Observable<boolean> {
        return this.getKeysByPrefix(prefix).pipe(
            switchMap(keys => this.removeItems(keys))
        );
    }

    /**
     * 从 localStorage 迁移数据到 IndexedDB
     * @param keys 要迁移的键名数组，如果为空则迁移所有 localStorage 数据
     * @param clearLocalStorage 迁移后是否清空 localStorage
     * @returns Observable<number> 返回迁移的数据条数
     */
    migrateFromLocalStorage(keys?: string[], clearLocalStorage: boolean = false): Observable<number> {
        return from(
            new Promise<number>((resolve, reject) => {
                try {
                    const itemsToMigrate: Array<{ key: string; value: any }> = [];
                    
                    if (keys && keys.length > 0) {
                        // 迁移指定的键
                        keys.forEach(key => {
                            const value = localStorage.getItem(key);
                            if (value !== null) {
                                try {
                                    // 尝试解析 JSON
                                    const parsed = JSON.parse(value);
                                    itemsToMigrate.push({ key, value: parsed });
                                } catch (e) {
                                    // 如果不是 JSON，直接使用字符串
                                    itemsToMigrate.push({ key, value });
                                }
                            }
                        });
                    } else {
                        // 迁移所有 localStorage 数据
                        for (let i = 0; i < localStorage.length; i++) {
                            const key = localStorage.key(i);
                            if (key) {
                                const value = localStorage.getItem(key);
                                if (value !== null) {
                                    try {
                                        const parsed = JSON.parse(value);
                                        itemsToMigrate.push({ key, value: parsed });
                                    } catch (e) {
                                        itemsToMigrate.push({ key, value });
                                    }
                                }
                            }
                        }
                    }

                    if (itemsToMigrate.length === 0) {
                        resolve(0);
                        return;
                    }

                    // 批量保存到 IndexedDB
                    this.setItems(itemsToMigrate).subscribe({
                        next: () => {
                            // 迁移成功后，可选择清空 localStorage
                            if (clearLocalStorage) {
                                if (keys && keys.length > 0) {
                                    keys.forEach(key => localStorage.removeItem(key));
                                } else {
                                    localStorage.clear();
                                }
                            }
                            resolve(itemsToMigrate.length);
                        },
                        error: (err) => {
                            console.error('从 localStorage 迁移数据失败:', err);
                            reject(err);
                        }
                    });
                } catch (err) {
                    console.error('读取 localStorage 失败:', err);
                    reject(err);
                }
            })
        );
    }

    /**
     * 检查并执行从 localStorage 到 IndexedDB 的自动迁移
     * 如果 IndexedDB 中没有数据但 localStorage 中有数据，则自动迁移
     * @returns Observable<boolean> 是否执行了迁移
     */
    autoMigrateFromLocalStorage(): Observable<boolean> {
        return from(
            new Promise<boolean>((resolve, reject) => {
                this.getCount().subscribe({
                    next: (count) => {
                        // 如果 IndexedDB 中已有数据，不执行迁移
                        if (count > 0) {
                            resolve(false);
                            return;
                        }

                        // 检查 localStorage 是否有数据
                        try {
                            if (localStorage.length === 0) {
                                resolve(false);
                                return;
                            }

                            // 执行迁移
                            this.migrateFromLocalStorage(undefined, false).subscribe({
                                next: (migratedCount) => {
                                    if (migratedCount > 0) {
                                        console.log(`已从 localStorage 自动迁移 ${migratedCount} 条数据到 IndexedDB`);
                                    }
                                    resolve(migratedCount > 0);
                                },
                                error: (err) => {
                                    console.error('自动迁移失败:', err);
                                    resolve(false);
                                }
                            });
                        } catch (err) {
                            console.error('检查 localStorage 失败:', err);
                            resolve(false);
                        }
                    },
                    error: (err) => {
                        console.error('检查 IndexedDB 数据量失败:', err);
                        resolve(false);
                    }
                });
            })
        );
    }
}

