import { Component, OnInit, Input, Output, EventEmitter, OnDestroy } from '@angular/core';
import { MatDialog as MatDialog } from '@angular/material/dialog';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { TranslateService } from '@ngx-translate/core';
import { GaugeSettings } from '../../../../_models/hmi';
import { Device } from '../../../../_models/device';
import { ProjectService } from '../../../../_services/project.service';
import type { EChartsOption } from 'echarts';

export interface GaugeEchartsProperty {
    chartType: string;
    chartConfig: EChartsOption;
    variableIds?: string[];
    autoRefresh?: boolean;
    refreshInterval?: number;
    [key: string]: any;
}

@Component({
    selector: 'app-echarts-property',
    templateUrl: './echarts-property.component.html',
    styleUrls: ['./echarts-property.component.scss']
})
export class EchartsPropertyComponent implements OnInit, OnDestroy {
    @Input() data: any;
    @Output() onPropChanged: EventEmitter<any> = new EventEmitter();
    @Input('reload') set reload(b: any) {
        this._reload();
    }

    settings: GaugeSettings;
    property: GaugeEchartsProperty;
    chartTypes = [
        { value: 'line', label: '折线图', icon: 'show_chart' },
        { value: 'bar', label: '柱状图', icon: 'bar_chart' },
        { value: 'pie', label: '饼图', icon: 'pie_chart' },
        { value: 'scatter', label: '散点图', icon: 'scatter_plot' },
        { value: 'radar', label: '雷达图', icon: 'radar' },
        { value: 'gauge', label: '仪表盘', icon: 'speed' },
        { value: 'funnel', label: '漏斗图', icon: 'filter_alt' },
        { value: 'map', label: '地图', icon: 'map' }
    ];

    devices: Device[] = [];
    variableIds: string[] = [];
    selectedChartType: string = 'line';

    private destroy$ = new Subject<void>();

    constructor(
        public dialog: MatDialog,
        public projectService: ProjectService,
        private translateService: TranslateService
    ) {}

    ngOnInit() {
        this._reload();
        this.devices = Object.values(this.projectService.getDevices());
    }

    ngOnDestroy() {
        this.destroy$.next(null);
        this.destroy$.complete();
    }

    private _reload() {
        this.settings = this.data.settings;
        this.property = this.settings.property || <GaugeEchartsProperty>{
            chartType: 'line',
            chartConfig: {},
            variableIds: [],
            autoRefresh: false,
            refreshInterval: 1000
        };
        this.selectedChartType = this.property.chartType || 'line';
        this.variableIds = this.property.variableIds || [];
    }

    onChartTypeChange(type: string) {
        this.selectedChartType = type;
        this.property.chartType = type;
        // 重置配置为默认值
        this.property.chartConfig = this.getDefaultConfig(type);
        this.onPropertyChanged();
    }

    getDefaultConfig(chartType: string): EChartsOption {
        const baseConfig: EChartsOption = {
            tooltip: {
                trigger: 'axis'
            },
            grid: {
                left: '3%',
                right: '4%',
                bottom: '3%',
                containLabel: true
            }
        };

        switch (chartType) {
            case 'line':
                return {
                    ...baseConfig,
                    xAxis: { type: 'category', data: [] },
                    yAxis: { type: 'value' },
                    series: [{ type: 'line', data: [] }]
                };
            case 'bar':
                return {
                    ...baseConfig,
                    xAxis: { type: 'category', data: [] },
                    yAxis: { type: 'value' },
                    series: [{ type: 'bar', data: [] }]
                };
            case 'pie':
                return {
                    tooltip: { trigger: 'item' },
                    legend: { orient: 'vertical', left: 'left' },
                    series: [{ type: 'pie', radius: '50%', data: [] }]
                };
            default:
                return baseConfig;
        }
    }

    onConfigChange(config: EChartsOption) {
        this.property.chartConfig = config;
        this.onPropertyChanged();
    }

    onVariableIdsChange(ids: string[]) {
        this.property.variableIds = ids;
        this.variableIds = ids;
        this.onPropertyChanged();
    }

    onAutoRefreshChange(enabled: boolean) {
        this.property.autoRefresh = enabled;
        this.onPropertyChanged();
    }

    onRefreshIntervalChange(interval: number) {
        this.property.refreshInterval = interval;
        this.onPropertyChanged();
    }

    onPropertyChanged() {
        this.settings.property = this.property;
        this.onPropChanged.emit({ settings: this.settings });
    }

    onEditConfig() {
        // 打开配置编辑器对话框
        // 这里可以打开一个代码编辑器来编辑ECharts配置
        const configStr = JSON.stringify(this.property.chartConfig, null, 2);
        // TODO: 实现配置编辑器
        console.log('Edit config:', configStr);
    }
}

