import type { MainAPI } from './MainAPI';

class ApiHolder {
    private apis: MainAPI[] = [];

    addPlugin(plugin: MainAPI) {
        // Check if plugin with same name already exists
        const existing = this.apis.find(api => api.name === plugin.name);
        if (existing) {
            console.warn(`Plugin with name ${plugin.name} already exists, replacing it`);
            this.removePlugin(existing);
        }
        this.apis.push(plugin);
    }

    removePlugin(plugin: MainAPI) {
        this.apis = this.apis.filter(p => p !== plugin);
    }

    getApi(name: string): MainAPI | undefined {
        return this.apis.find(api => api.name === name);
    }

    getAllApis(): MainAPI[] {
        return [...this.apis];
    }
}

export const apiHolder = new ApiHolder();
