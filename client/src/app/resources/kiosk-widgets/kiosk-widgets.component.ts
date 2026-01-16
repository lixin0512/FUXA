import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { MatDialogRef as MatDialogRef } from '@angular/material/dialog';
import { KioskWidgetsService } from './kiosk-widgets.service';
import { map, Observable } from 'rxjs';
import { ResourceItem, Resources, ResourceType, WidgetsResource } from '../../_models/resources';
import { ResourcesService } from '../../_services/resources.service';
import { TransferResult, MyFileService } from '../../_services/my-file.service';
import { ToastNotifierService } from '../../_services/toast-notifier.service';
import { LibWidgetsService } from '../lib-widgets/lib-widgets.service';

@Component({
    selector: 'app-kiosk-widgets',
    templateUrl: './kiosk-widgets.component.html',
    styleUrls: ['./kiosk-widgets.component.scss']
})
export class KioskWidgetsComponent implements OnInit {

    resourceWidgets$: Observable<WidgetsResource[]>;
    groupContent: { [path: string]: WidgetsResource[] } = {};
    loadingGroups: { [path: string]: boolean } = {};
    existingWidgets: string[] = [];
    assetBaseUrl: string;
    changed = false;
    selectedItems: { [path: string]: Set<string> } = {}; // 每个分组选中的项目
    isDownloading: boolean = false;
    downloadProgress: { total: number; completed: number } = { total: 0, completed: 0 };
    isUploading: boolean = false;
    isDragOver: boolean = false;
    uploadProgress: { total: number; completed: number; failed: number } = { total: 0, completed: 0, failed: 0 };
    uploadQueue: File[] = [];

    @ViewChild('fileInput', { static: false }) fileInput: ElementRef;

    constructor(
        public dialogRef: MatDialogRef<KioskWidgetsComponent>,
        private resourcesService: ResourcesService,
        private toastNotifier: ToastNotifierService,
        private kioskWidgetService: KioskWidgetsService,
        private fileService: MyFileService,
        private libWidgetsService: LibWidgetsService,
    ) {
        this.assetBaseUrl = this.kioskWidgetService.widgetAssetBaseUrl;
    }

    ngOnInit() {
        this.resourceWidgets$ = this.kioskWidgetService.resourceWidgets$;
        this.resourcesService.getResources(ResourceType.widgets).pipe(
            map((res: Resources) =>
                res.groups
                    .reduce((acc: ResourceItem[], group) => acc.concat(group.items || []), [])
                    .map(item => item.name)
                    .filter(name => !!name)
            )
        ).subscribe(items => {
            this.existingWidgets = items;
        });
    }

    onGroupExpand(groupPath: string): void {
        if (!this.groupContent[groupPath]) {
            this.loadingGroups[groupPath] = true;
            this.kioskWidgetService.getWidgetsGroupContent(groupPath).subscribe(res => {
                const enrichedItems = res.map(item => ({
                    ...item,
                    exist: this.existingWidgets.includes(item.name || '')
                }));
                this.groupContent[groupPath] = enrichedItems;
                this.loadingGroups[groupPath] = false;
            }, err => {
                console.error('Load Widgets resources error: ', err);
                this.loadingGroups[groupPath] = false;
            });
        }
    }

    onDownload(item: WidgetItemType) {
        const fileUrl = this.assetBaseUrl + item.path;
        const fileName = item.name || item.path.split('/').pop();

        this.kioskWidgetService.uploadWidgetFromUrl(fileUrl, item.path, fileName).subscribe({
            next: (result: TransferResult) => {
                if (!result.result && result.error) {
                    console.error(result.error);
                    this.toastNotifier.notifyError('msg.file-upload-failed', result.error);
                } else {
                    item.exist = true;
                    this.changed = true;
                }
            },
            error: err => {
                console.error('Download or upload failed:', err);
                this.toastNotifier.notifyError('msg.file-download-failed', err.message || err);
            }
        });
    }

    // 全选/取消全选某个分组
    onToggleSelectAll(groupPath: string, items: WidgetItemType[]) {
        if (!this.selectedItems[groupPath]) {
            this.selectedItems[groupPath] = new Set();
        }
        
        const allSelected = items.every(item => !item.exist && this.selectedItems[groupPath].has(item.path));
        
        if (allSelected) {
            // 取消全选
            items.forEach(item => {
                if (!item.exist) {
                    this.selectedItems[groupPath].delete(item.path);
                }
            });
        } else {
            // 全选
            items.forEach(item => {
                if (!item.exist) {
                    this.selectedItems[groupPath].add(item.path);
                }
            });
        }
    }

    // 切换单个项目的选中状态
    onToggleSelect(groupPath: string, itemPath: string) {
        if (!this.selectedItems[groupPath]) {
            this.selectedItems[groupPath] = new Set();
        }
        
        if (this.selectedItems[groupPath].has(itemPath)) {
            this.selectedItems[groupPath].delete(itemPath);
        } else {
            this.selectedItems[groupPath].add(itemPath);
        }
    }

    // 检查分组是否全选
    isGroupAllSelected(groupPath: string, items: WidgetItemType[]): boolean {
        if (!items || items.length === 0) return false;
        const selectableItems = items.filter(item => !item.exist);
        if (selectableItems.length === 0) return false;
        
        if (!this.selectedItems[groupPath]) return false;
        return selectableItems.every(item => this.selectedItems[groupPath].has(item.path));
    }

    // 检查分组是否部分选中
    isGroupPartiallySelected(groupPath: string, items: WidgetItemType[]): boolean {
        if (!items || items.length === 0) return false;
        const selectableItems = items.filter(item => !item.exist);
        if (selectableItems.length === 0) return false;
        
        if (!this.selectedItems[groupPath]) return false;
        const selectedCount = selectableItems.filter(item => this.selectedItems[groupPath].has(item.path)).length;
        return selectedCount > 0 && selectedCount < selectableItems.length;
    }

    // 检查项目是否选中
    isItemSelected(groupPath: string, itemPath: string): boolean {
        return this.selectedItems[groupPath]?.has(itemPath) || false;
    }

    // 获取所有选中的项目
    getAllSelectedItems(): Array<{ groupPath: string; item: WidgetItemType }> {
        const selected: Array<{ groupPath: string; item: WidgetItemType }> = [];
        
        Object.keys(this.selectedItems).forEach(groupPath => {
            const items = this.groupContent[groupPath];
            if (items) {
                items.forEach(item => {
                    if (this.selectedItems[groupPath].has(item.path)) {
                        selected.push({ groupPath, item });
                    }
                });
            }
        });
        
        return selected;
    }

    // 批量下载
    onBatchDownload() {
        const selectedItems = this.getAllSelectedItems();
        
        if (selectedItems.length === 0) {
            this.toastNotifier.notifyError('msg.file-download-failed', '请先选择要下载的项目');
            return;
        }

        this.isDownloading = true;
        this.downloadProgress = { total: selectedItems.length, completed: 0 };
        
        let completedCount = 0;
        let errorCount = 0;
        
        // 逐个下载，避免并发过多
        const downloadNext = (index: number) => {
            if (index >= selectedItems.length) {
                this.isDownloading = false;
                if (errorCount === 0) {
                    this.toastNotifier.notifySuccess('msg.file-upload-success', `成功下载 ${completedCount} 个项目`);
                } else {
                    this.toastNotifier.notifyError('msg.file-download-failed', `下载完成：成功 ${completedCount} 个，失败 ${errorCount} 个`);
                }
                // 清空选中状态
                this.selectedItems = {};
                return;
            }

            const { item } = selectedItems[index];
            const fileUrl = this.assetBaseUrl + item.path;
            const fileName = item.name || item.path.split('/').pop();

            this.kioskWidgetService.uploadWidgetFromUrl(fileUrl, item.path, fileName).subscribe({
                next: (result: TransferResult) => {
                    if (!result.result && result.error) {
                        console.error(result.error);
                        errorCount++;
                    } else {
                        item.exist = true;
                        this.changed = true;
                        completedCount++;
                    }
                    this.downloadProgress.completed = completedCount + errorCount;
                    // 继续下载下一个
                    setTimeout(() => downloadNext(index + 1), 100); // 延迟100ms避免过快
                },
                error: err => {
                    console.error('Download or upload failed:', err);
                    errorCount++;
                    this.downloadProgress.completed = completedCount + errorCount;
                    // 继续下载下一个
                    setTimeout(() => downloadNext(index + 1), 100);
                }
            });
        };

        downloadNext(0);
    }

    onNoClick(): void {
        this.dialogRef.close(this.changed);
    }

    onOkClick(): void {
        this.dialogRef.close(this.changed);
    }

    // 上传相关方法
    onUploadClick() {
        if (this.fileInput) {
            this.fileInput.nativeElement.click();
        }
    }

    onFileSelected(event: any) {
        const files = event.target.files;
        if (!files || files.length === 0) {
            return;
        }

        this.processFiles(Array.from(files));
        
        // 清空文件选择
        if (this.fileInput) {
            this.fileInput.nativeElement.value = '';
        }
    }

    processFiles(files: File[]) {
        const allowedExtensions = ['png', 'gif', 'bmp', 'jpg', 'jpeg', 'svg'];
        const validFiles: File[] = [];
        const invalidFiles: string[] = [];

        // 验证文件格式
        files.forEach(file => {
            const fileExtension = file.name.split('.').pop()?.toLowerCase();
            if (fileExtension && allowedExtensions.includes(fileExtension)) {
                validFiles.push(file);
            } else {
                invalidFiles.push(file.name);
            }
        });

        if (invalidFiles.length > 0) {
            this.toastNotifier.notifyError('msg.file-upload-failed', 
                `以下文件格式不支持：${invalidFiles.join(', ')}。仅支持 PNG、GIF、BMP、JPG、JPEG、SVG 格式`);
        }

        if (validFiles.length > 0) {
            this.uploadFiles(validFiles);
        }
    }

    uploadFiles(files: File[]) {
        this.uploadQueue = files;
        this.uploadProgress = { total: files.length, completed: 0, failed: 0 };
        this.isUploading = true;

        let completedCount = 0;
        let failedCount = 0;

        const uploadNext = (index: number) => {
            if (index >= files.length) {
                this.isUploading = false;
                this.changed = true;
                if (failedCount === 0) {
                    this.toastNotifier.notifySuccess('msg.file-upload-success', 
                        `成功上传 ${completedCount} 个图片，可在小部件菜单中使用`);
                } else {
                    this.toastNotifier.notifyError('msg.file-upload-failed', 
                        `上传完成：成功 ${completedCount} 个，失败 ${failedCount} 个`);
                }
                // 刷新小部件菜单和资源列表
                this.libWidgetsService.refreshResources();
                this.resourcesService.getResources(ResourceType.widgets).pipe(
                    map((res: Resources) =>
                        res.groups
                            .reduce((acc: ResourceItem[], group) => acc.concat(group.items || []), [])
                            .map(item => item.name)
                            .filter(name => !!name)
                    )
                ).subscribe(items => {
                    this.existingWidgets = items;
                });
                this.uploadQueue = [];
                return;
            }

            const file = files[index];
            this.fileService.upload(file, 'widgets').subscribe({
                next: (result) => {
                    if (result.error) {
                        failedCount++;
                    } else {
                        completedCount++;
                    }
                    this.uploadProgress.completed = completedCount + failedCount;
                    this.uploadProgress.failed = failedCount;
                    // 继续上传下一个，延迟100ms避免过快
                    setTimeout(() => uploadNext(index + 1), 100);
                },
                error: (err) => {
                    failedCount++;
                    this.uploadProgress.completed = completedCount + failedCount;
                    this.uploadProgress.failed = failedCount;
                    setTimeout(() => uploadNext(index + 1), 100);
                }
            });
        };

        uploadNext(0);
    }

    // 拖拽上传相关事件
    onDragOver(event: DragEvent) {
        event.preventDefault();
        event.stopPropagation();
        this.isDragOver = true;
        if (event.dataTransfer) {
            event.dataTransfer.dropEffect = 'copy';
        }
    }

    onDragLeave(event: DragEvent) {
        event.preventDefault();
        event.stopPropagation();
        this.isDragOver = false;
    }

    onDrop(event: DragEvent) {
        event.preventDefault();
        event.stopPropagation();
        this.isDragOver = false;

        const files = event.dataTransfer?.files;
        if (files && files.length > 0) {
            this.processFiles(Array.from(files));
        }
    }
}

interface WidgetItemType extends ResourceItem {
    exist?: boolean;
}
