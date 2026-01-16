import { Component, AfterViewInit, OnDestroy } from '@angular/core';
import { MatDialogRef as MatDialogRef } from '@angular/material/dialog';
import { Subscription } from 'rxjs';

import { ResourceGroup, Resources, ResourceType } from '../../_models/resources';
import { ResourcesService } from '../../_services/resources.service';
import { EndPointApi } from '../../_helpers/endpointapi';

@Component({
    selector: 'app-lib-images',
    templateUrl: './lib-images.component.html',
    styleUrls: ['./lib-images.component.css']
})
export class LibImagesComponent implements AfterViewInit, OnDestroy {
    private endPointConfig: string = EndPointApi.getURL();
    resImages?: ResourceGroup[];
    subscription: Subscription;
    draggedImage: string | null = null;

    constructor(
        private dialogRef: MatDialogRef<LibImagesComponent>,
        private resourcesService: ResourcesService) { }

    ngAfterViewInit() {
        this.loadResources();
    }

    ngOnDestroy() {
        try {
            this.subscription.unsubscribe();
        } catch (err) {
            console.error(err);
        }
    }

    loadResources() {
        if (this.subscription) {
            this.subscription.unsubscribe();
        }
        this.subscription = this.resourcesService.getResources(ResourceType.images).subscribe((result: Resources) => {
            const groups = result?.groups || [];
            // 过滤掉 uploaded 项
            const filteredGroups = groups.filter(group => group.name !== 'uploaded' && group.name !== 'uploaded/');
            filteredGroups.forEach(group => {
                group.items.forEach(item => {
                    item.path = `${this.endPointConfig}/${item.path}`;
                });
            });
            this.resImages = filteredGroups;
        }, err => {
            console.error('get Resources images error: ' + err);
        });
    }

    onSelect(imgPath: string) {
        this.dialogRef.close(imgPath);
    }

    onNoClick(): void {
        this.dialogRef.close();
    }

    isVideo(path: string): boolean {
        return this.resourcesService.isVideo(path);
    }

    onDragStart(event: DragEvent, imgPath: string) {
        this.draggedImage = imgPath;
        if (event.dataTransfer) {
            event.dataTransfer.effectAllowed = 'copy';
            // 设置拖拽数据
            event.dataTransfer.setData('text/plain', imgPath);
        }
    }

    onDragEnd(event: DragEvent) {
        this.draggedImage = null;
    }
}
