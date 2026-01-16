import { Component, OnInit, OnDestroy, Input, Output, EventEmitter, ViewChild, ElementRef, NgZone, OnChanges, SimpleChanges } from '@angular/core';
import * as echarts from 'echarts';
import type { EChartsOption } from 'echarts';

@Component({
  selector: 'app-echarts-wrapper',
  templateUrl: './echarts-wrapper.component.html',
  styleUrls: ['./echarts-wrapper.component.scss']
})
export class EchartsWrapperComponent implements OnInit, OnDestroy, OnChanges {
  @ViewChild('chartContainer', { static: false }) chartContainer: ElementRef;
  @Input() options: EChartsOption;
  @Input() theme: string | object;
  @Input() loading: boolean = false;
  @Input() autoResize: boolean = true;
  @Input() notMerge: boolean = false;
  @Output() chartInit = new EventEmitter<echarts.ECharts>();
  @Output() chartClick = new EventEmitter<any>();
  @Output() chartReady = new EventEmitter<echarts.ECharts>();
  @Output() chartDblClick = new EventEmitter<any>();

  private chartInstance: echarts.ECharts;
  private resizeObserver: ResizeObserver;
  private resizeTimer: any;

  constructor(private ngZone: NgZone) {}

  ngOnInit() {
    // 延迟初始化，确保DOM已渲染
    setTimeout(() => {
      this.initChart();
    }, 0);
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['options'] && !changes['options'].firstChange && this.chartInstance) {
      this.updateChart();
    }
    if (changes['loading'] && this.chartInstance) {
      if (this.loading) {
        this.chartInstance.showLoading();
      } else {
        this.chartInstance.hideLoading();
      }
    }
  }

  ngOnDestroy() {
    this.destroyChart();
  }

  private initChart() {
    if (!this.chartContainer?.nativeElement) {
      return;
    }

    this.ngZone.runOutsideAngular(() => {
      try {
        this.chartInstance = echarts.init(
          this.chartContainer.nativeElement,
          this.theme,
          {
            renderer: 'canvas',
            useDirtyRect: true // 启用脏矩形优化
          }
        );

        if (this.options) {
          this.chartInstance.setOption(this.options, this.notMerge);
        }

        // 事件绑定
        this.chartInstance.on('click', (params) => {
          this.ngZone.run(() => {
            this.chartClick.emit(params);
          });
        });

        this.chartInstance.on('dblclick', (params) => {
          this.ngZone.run(() => {
            this.chartDblClick.emit(params);
          });
        });

        this.chartInit.emit(this.chartInstance);
        this.chartReady.emit(this.chartInstance);

        // 自动调整大小
        if (this.autoResize) {
          this.setupResizeObserver();
        }

        if (this.loading) {
          this.chartInstance.showLoading();
        }
      } catch (error) {
        console.error('ECharts initialization error:', error);
      }
    });
  }

  private setupResizeObserver() {
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => {
        // 防抖处理
        if (this.resizeTimer) {
          clearTimeout(this.resizeTimer);
        }
        this.resizeTimer = setTimeout(() => {
          this.ngZone.runOutsideAngular(() => {
            if (this.chartInstance) {
              this.chartInstance.resize();
            }
          });
        }, 100);
      });
      this.resizeObserver.observe(this.chartContainer.nativeElement);
    } else {
      // 降级方案：使用window resize事件
      window.addEventListener('resize', this.handleResize.bind(this));
    }
  }

  private handleResize() {
    if (this.chartInstance) {
      this.ngZone.runOutsideAngular(() => {
        this.chartInstance.resize();
      });
    }
  }

  public updateChart() {
    if (this.chartInstance && this.options) {
      this.ngZone.runOutsideAngular(() => {
        this.chartInstance.setOption(this.options, this.notMerge);
      });
    }
  }

  public updateOptions(options: EChartsOption, notMerge: boolean = false) {
    if (this.chartInstance) {
      this.ngZone.runOutsideAngular(() => {
        this.chartInstance.setOption(options, notMerge);
      });
    }
  }

  public getChartInstance(): echarts.ECharts {
    return this.chartInstance;
  }

  public resize() {
    if (this.chartInstance) {
      this.ngZone.runOutsideAngular(() => {
        this.chartInstance.resize();
      });
    }
  }

  public dispose() {
    this.destroyChart();
  }

  private destroyChart() {
    if (this.resizeTimer) {
      clearTimeout(this.resizeTimer);
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    if (this.chartInstance) {
      try {
        this.chartInstance.dispose();
      } catch (error) {
        console.error('ECharts dispose error:', error);
      }
      this.chartInstance = null;
    }
  }
}

