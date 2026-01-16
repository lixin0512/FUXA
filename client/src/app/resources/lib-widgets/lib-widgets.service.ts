import { Injectable } from '@angular/core';
import { Observable, Subject, map, startWith, switchMap } from 'rxjs';
import { ResourceGroup, ResourceItem, ResourceType } from '../../_models/resources';
import { ResourcesService } from '../../_services/resources.service';

@Injectable({
    providedIn: 'root'
})
export class LibWidgetsService {

    clearSelection$ = new Subject<void>();
    svgWidgetSelected$ = new Subject<string>();
    imageWidgetSelected$ = new Subject<string>(); // 用于图片格式的小部件
    private refreshSubject = new Subject<void>();

    constructor(
        private resourcesService: ResourcesService) {
    }

    public resourceWidgets$: Observable<ResourceGroup[]> = this.refreshSubject.pipe(
        startWith(0),
        switchMap(() =>
            this.resourcesService.getResources(ResourceType.widgets).pipe(
                map(images => images.groups)
            )
        )
    );

    clearSelection() {
        this.clearSelection$.next(null);
    }

    widgetSelected(widgetPath: string) {
        const extension = widgetPath.split('.').pop().toLowerCase();
        if (extension === 'svg') {
            this.svgWidgetSelected$.next(widgetPath);
        } else if (['png', 'gif', 'bmp', 'jpg', 'jpeg'].includes(extension)) {
            // 图片格式的小部件
            this.imageWidgetSelected$.next(widgetPath);
        }
    }

    refreshResources(): void {
        this.refreshSubject.next(null);
    }

    removeWidget(widget: ResourceItem) {
        return this.resourcesService.removeWidget(widget);
    }
}
