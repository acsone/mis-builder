/** @odoo-module **/

import {Component, onWillStart, useState, useSubEnv} from "@odoo/owl";
import {useBus, useService} from "@web/core/utils/hooks";
import {DatePicker} from "@web/core/datepicker/datepicker";
import {FilterMenu} from "@web/search/filter_menu/filter_menu";
import {SearchBar} from "@web/search/search_bar/search_bar";
import {SearchModel} from "@web/search/search_model";
import {parseDate} from "@web/core/l10n/dates";
import {registry} from "@web/core/registry";
import Dialog from "web.Dialog";
import {qweb} from "web.core";

export class MisReportWidget extends Component {
    setup() {
        super.setup();
        this.orm = useService("orm");
        this.user = useService("user");
        this.action = useService("action");
        this.view = useService("view");
        this.JSON = JSON;
        this.state = useState({
            mis_report_data: {header: [], body: [], notes: []},
            pivot_date: null,
        });
        this.searchModel = new SearchModel(this.env, {
            user: this.user,
            orm: this.orm,
            view: this.view,
        });
        useSubEnv({searchModel: this.searchModel});
        useBus(this.env.searchModel, "update", async () => {
            await this.env.searchModel.sectionsPromise;
            this.refresh();
        });
        onWillStart(this.willStart);
    }

    // Lifecycle
    async willStart() {
        const [result] = await this.orm.read(
            "mis.report.instance",
            [this._instanceId()],
            [
                "source_aml_model_name",
                "widget_show_filters",
                "widget_show_settings_button",
                "widget_search_view_id",
                "pivot_date",
                "widget_show_pivot_date",
            ],
            {context: this.context}
        );
        this.source_aml_model_name = result.source_aml_model_name;
        this.widget_show_filters = result.widget_show_filters;
        this.widget_show_settings_button = result.widget_show_settings_button;
        this.widget_search_view_id =
            result.widget_search_view_id && result.widget_search_view_id[0];
        this.state.pivot_date = parseDate(result.pivot_date);
        this.widget_show_pivot_date = result.widget_show_pivot_date;
        if (this.showSearchBar) {
            // Initialize the search model
            await this.searchModel.load({
                resModel: this.source_aml_model_name,
                searchViewId: this.widget_search_view_id,
            });
        }

        // Compute the report
        this.refresh();
    }

    get showSearchBar() {
        return (
            this.source_aml_model_name &&
            this.widget_show_filters &&
            this.widget_search_view_id
        );
    }

    get showPivotDate() {
        return this.widget_show_pivot_date;
    }

    /**
     * Return the id of the mis.report.instance to which the widget is
     * bound.
     *
     * @returns int
     */
    _instanceId() {
        if (this.props.value) {
            return this.props.value;
        }

        /*
         * This trick is needed because in a dashboard the view does
         * not seem to be bound to an instance: it seems to be a limitation
         * of Odoo dashboards that are not designed to contain forms but
         * rather tree views or charts.
         */
        var context = this.props.record.context;
        if (context.active_model === "mis.report.instance") {
            return context.active_id;
        }
    }

    get context() {
        var ctx = super.context;
        if (this.showSearchBar) {
            ctx = {
                ...ctx,
                mis_analytic_domain: this.searchModel.searchDomain,
            };
        }
        if (this.showPivotDate && this.state.pivot_date) {
            ctx = {
                ...ctx,
                mis_pivot_date: this.state.pivot_date,
            };
        }
        return ctx;
    }

    async drilldown(event) {
        const drilldown = $(event.target).data("drilldown");
        const action = await this.orm.call(
            "mis.report.instance",
            "drilldown",
            [this._instanceId(), drilldown],
            {context: this.context}
        );
        this.action.doAction(action);
    }

    async refresh() {
        this.state.mis_report_data = await this.orm.call(
            "mis.report.instance",
            "compute",
            [this._instanceId()],
            {context: this.context}
        );
    }

    async printPdf() {
        const action = await this.orm.call(
            "mis.report.instance",
            "print_pdf",
            [this._instanceId()],
            {context: this.context}
        );
        this.action.doAction(action);
    }

    async exportXls() {
        const action = await this.orm.call(
            "mis.report.instance",
            "export_xls",
            [this._instanceId()],
            {context: this.context}
        );
        this.action.doAction(action);
    }

    async displaySettings() {
        const action = await this.orm.call(
            "mis.report.instance",
            "display_settings",
            [this._instanceId()],
            {context: this.context}
        );
        this.action.doAction(action);
    }

    async _remove_annotation(note_arg) {
        const note = this.state.mis_report_data.notes.filter((note) => {
            const [periodId, kpiId, subKpiId] = note.note_index;
            return (
                (kpiId === note_arg.kpi_id ||
                    (Boolean(kpiId), Boolean(note_arg.kpiId)) === (false, false)) &&
                (note_arg.period_id === periodId ||
                    (Boolean(periodId), Boolean(note_arg.periodId)) ===
                        (false, false)) &&
                (note_arg.subkpi_id === subKpiId ||
                    (Boolean(subKpiId), Boolean(note_arg.subkpi_id)) === (false, false))
            );
        });
        if (note[0]) {
            // Erase content of note
            note[0].note_text = "";
            note[0].note_sequence = "/";
        }

        await this.orm.call(
            "mis.report.instance.annotation",
            "remove_annotation",
            [note_arg.period_id, note_arg.kpi_id, note_arg.subkpi_id],
            {context: this.context}
        );
    }

    async _save_annotation(note_arg) {
        const text = $(".o_mis_builder_annotation_text").val();
        const note_text = this.state.mis_report_data.notes.filter((note) => {
            const [periodId, kpiId, subKpiId] = note.note_index;
            return (
                kpiId === note_arg.kpi_id &&
                note_arg.period_id === periodId &&
                note_arg.subkpi_id === subKpiId
            );
        });
        if (note_text[0]) {
            note_text[0].note_text = text;
        } else {
            this.state.mis_report_data.notes.push({
                note_index: [note_arg.period_id, note_arg.kpi_id, note_arg.subkpi_id],
                note_text: text,
            });
        }

        await this.orm.call(
            "mis.report.instance.annotation",
            "edit_annotation",
            [note_arg.period_id, note_arg.kpi_id, note_arg.subkpi_id, text],
            {context: this.context}
        );
    }

    async annotate(event) {
        const note_arg = $(event.target).data("annotation");
        const note_text = this.associated_note(note_arg);
        if (note_text[0]) {
            new Dialog(this, {
                title: "Annotate",
                size: "medium",
                $content: $(
                    qweb.render("mis_builder.annotation_dialog", {
                        text: note_text[0].note_text,
                    })
                ),
                buttons: [
                    {
                        text: this.env._t("Save"),
                        classes: "btn-primary",
                        close: true,
                        click: this._save_annotation.bind(this, note_arg),
                    },
                    {
                        text: this.env._t("Cancel"),
                        close: true,
                    },
                    {
                        text: this.env._t("Remove"),
                        classes: "btn-secondary",
                        close: true,
                        click: this._remove_annotation.bind(this, note_arg),
                    },
                ],
            }).open();
        } else {
            new Dialog(this, {
                title: "Annotate",
                size: "medium",
                $content: $(qweb.render("mis_builder.annotation_dialog", {text: ""})),
                buttons: [
                    {
                        text: this.env._t("Save"),
                        classes: "btn-primary",
                        close: true,
                        click: this._save_annotation.bind(this, note_arg),
                    },
                    {
                        text: this.env._t("Cancel"),
                        close: true,
                    },
                ],
            }).open();
        }
    }

    async remove_annotation(event) {
        const anotation_idx = $(event.target).data("rmv-annotation").split(",");
        this._remove_annotation({
            period_id: parseInt(anotation_idx[0]),
            kpi_id: parseInt(anotation_idx[1]),
            subkpi_id: parseInt(anotation_idx[2]),
        });
    }

    associated_note(note_arg) {
        // Filter
        const note_text = this.state.mis_report_data.notes.filter((note) => {
            const [periodId, kpiId, subKpiId] = note.note_index;
            return (
                kpiId === note_arg.kpi_id &&
                note_arg.period_id === periodId &&
                note_arg.subkpi_id === subKpiId
            );
        });
        return note_text;
    }

    onDateTimeChanged(ev) {
        this.state.pivot_date = ev;
        this.refresh();
    }
}

MisReportWidget.components = {FilterMenu, SearchBar, DatePicker};
MisReportWidget.template = "mis_builder.MisReportWidget";

registry.category("fields").add("mis_report_widget", MisReportWidget);
