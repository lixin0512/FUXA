import { Component, ViewContainerRef, ComponentFactoryResolver } from '@angular/core';
import { GaugeBaseComponent } from '../../gauge-base/gauge-base.component';
import { GaugeSettings, Variable, GaugeStatus } from '../../../_models/hmi';
import { Utils } from '../../../_helpers/utils';
import { GaugeDialogType } from '../../gauge-property/gauge-property.component';
import { EchartsWrapperComponent } from './echarts-wrapper/echarts-wrapper.component';
import type { EChartsOption } from 'echarts';
import * as echarts from 'echarts';

@Component({
    selector: 'html-echarts',
    templateUrl: './html-echarts.component.html',
    styleUrls: ['./html-echarts.component.scss']
})
export class HtmlEchartsComponent extends GaugeBaseComponent {
    static TypeTag = 'svg-ext-own_ctrl-echarts';
    static LabelTag = 'ECharts';
    static prefixD = 'D-OXC_';

    constructor(private resolver: ComponentFactoryResolver) {
        super();
    }

    static getSignals(pro: any): string[] {
        return pro?.variableIds || [];
    }

    static getDialogType(): GaugeDialogType {
        return GaugeDialogType.Echarts;
    }

    static processValue(
        ga: GaugeSettings,
        svgele: any,
        sig: Variable,
        gaugeStatus: GaugeStatus,
        gauge?: EchartsWrapperComponent
    ) {
        try {
            if (gauge && gauge.getChartInstance()) {
                // 更新图表数据
                const chartInstance = gauge.getChartInstance();
                const options = chartInstance.getOption() as EChartsOption;

                // 根据配置更新对应的series数据
                if (options.series && Array.isArray(options.series)) {
                    const series = options.series as any[];
                    // 查找对应的series并更新数据
                    // 这里需要根据实际的配置结构来实现
                    chartInstance.setOption(options, false);
                }
            }
        } catch (err) {
            console.error('ECharts processValue error:', err);
        }
    }

    static initElement(
        gab: GaugeSettings,
        resolver: ComponentFactoryResolver,
        viewContainerRef: ViewContainerRef,
        isview: boolean
    ): EchartsWrapperComponent {
        let ele = document.getElementById(gab.id);
        if (ele) {
            ele?.setAttribute('data-name', gab.name);
            let htmlEcharts = Utils.searchTreeStartWith(ele, this.prefixD);

            if (htmlEcharts) {
                const factory = resolver.resolveComponentFactory(EchartsWrapperComponent);
                const componentRef = viewContainerRef.createComponent(factory);

                htmlEcharts.innerHTML = '';
                componentRef.instance.autoResize = true;

                // 构建ECharts配置
                const chartOptions = HtmlEchartsComponent.buildChartOptions(gab.property, htmlEcharts);
                componentRef.instance.options = chartOptions;
                componentRef.instance.loading = false;

                componentRef.changeDetectorRef.detectChanges();
                htmlEcharts.appendChild(componentRef.location.nativeElement);

                // 保存组件引用
                componentRef.instance['myComRef'] = componentRef;
                componentRef.instance['name'] = gab.name;
                componentRef.instance['gaugeId'] = gab.id;

                return componentRef.instance;
            }
        }
        return null;
    }

    static buildChartOptions(property: any, container?: HTMLElement): EChartsOption {
        // 根据property配置构建ECharts选项
        const chartType = property?.chartType || 'line';
        const width = container?.clientWidth || 400;
        const height = container?.clientHeight || 300;

        const baseOption: EChartsOption = {
            tooltip: {
                trigger: 'axis',
                axisPointer: {
                    type: 'cross'
                }
            },
            grid: {
                left: '3%',
                right: '4%',
                bottom: '3%',
                top: '10%',
                containLabel: true
            },
            legend: {
                data: property?.legendData || [],
                show: property?.showLegend !== false
            }
        };

        switch (chartType) {
            case 'line':
                return {
                    ...baseOption,
                    xAxis: {
                        type: 'category',
                        boundaryGap: false,
                        data: property?.xAxisData || []
                    },
                    yAxis: {
                        type: 'value'
                    },
                    series: property?.series || [{
                        type: 'line',
                        data: [],
                        smooth: property?.smooth !== false
                    }]
                };

            case 'bar':
                return {
                    ...baseOption,
                    xAxis: {
                        type: 'category',
                        data: property?.xAxisData || []
                    },
                    yAxis: {
                        type: 'value'
                    },
                    series: property?.series || [{
                        type: 'bar',
                        data: []
                    }]
                };

            case 'pie':
                return {
                    ...baseOption,
                    tooltip: {
                        trigger: 'item',
                        formatter: '{a} <br/>{b}: {c} ({d}%)'
                    },
                    legend: {
                        orient: 'vertical',
                        left: 'left',
                        data: property?.legendData || []
                    },
                    series: property?.series || [{
                        name: '数据',
                        type: 'pie',
                        radius: ['40%', '70%'],
                        avoidLabelOverlap: false,
                        label: {
                            show: false,
                            position: 'center'
                        },
                        emphasis: {
                            label: {
                                show: true,
                                fontSize: '30',
                                fontWeight: 'bold'
                            }
                        },
                        labelLine: {
                            show: false
                        },
                        data: []
                    }]
                };

            case 'scatter':
                return {
                    ...baseOption,
                    xAxis: {
                        type: 'value',
                        scale: true
                    },
                    yAxis: {
                        type: 'value',
                        scale: true
                    },
                    series: property?.series || [{
                        type: 'scatter',
                        data: []
                    }]
                };

            default:
                return baseOption;
        }
    }

    static detectChange(gab: GaugeSettings, res: any, ref: any) {
        return HtmlEchartsComponent.initElement(gab, res, ref, false);
    }
}

